import crypto from 'crypto';
import { OtpChannel, OtpPurpose, OtpStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { config } from '../../config';
import { AppError } from '../utils/app-error';
import { smsService } from './sms.service';
import { emailService } from './email.service';

export interface GenerateOtpOptions {
  identifier: string;
  channel: OtpChannel;
  purpose?: OtpPurpose;
  ipAddress?: string;
}

export interface VerifyOtpOptions {
  identifier: string;
  enteredOtp: string;
  purpose?: OtpPurpose;
}

export interface GenerateOtpResponse {
  identifier: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  expiresAt: Date;
  cooldownSeconds: number;
}

export class ProductionOtpService {
  // Test harness in-memory cache for fast automated test lookup strictly in test mode
  private testOtpHarness: Map<string, string> = new Map();

  /**
   * Generates a cryptographically secure 6-digit numeric OTP (100000 - 999999).
   */
  private generateSecure6DigitCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Generates a SHA-256 HMAC hash of the OTP salted with application secret and target identifier.
   * Ensures plaintext OTP is NEVER stored in the database.
   */
  private hashOtp(identifier: string, otp: string): string {
    return crypto
      .createHmac('sha256', config.OTP_HMAC_SECRET)
      .update(`${identifier.trim().toLowerCase()}:${otp.trim()}`)
      .digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Normalizes identifier based on channel
   */
  public normalizeIdentifier(identifier: string, channel: OtpChannel): string {
    if (channel === OtpChannel.PHONE) {
      return smsService.normalizeToE164(identifier);
    }
    return identifier.trim().toLowerCase();
  }

  /**
   * Dispatches a real OTP to the target phone or email, enforcing cooldown and storing hashed verification record.
   */
  public async generateAndSendOtp(options: GenerateOtpOptions): Promise<GenerateOtpResponse> {
    const { channel, ipAddress } = options;
    const purpose = options.purpose || OtpPurpose.LOGIN;
    const normalizedIdentifier = this.normalizeIdentifier(options.identifier, channel);

    // 1. Check Resend Cooldown (e.g. 60 seconds)
    const existingPending = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedIdentifier,
        purpose,
        status: OtpStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const cooldownMs = config.OTP_RESEND_COOLDOWN_SECONDS * 1000;

    if (existingPending) {
      const elapsedMs = now - existingPending.lastSentAt.getTime();
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw AppError.tooManyRequests(
          `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before requesting another OTP.`
        );
      }

      // Expire previous pending OTPs to enforce strict single-active-OTP rule
      await prisma.otpVerification.updateMany({
        where: {
          identifier: normalizedIdentifier,
          purpose,
          status: OtpStatus.PENDING,
        },
        data: {
          status: OtpStatus.EXPIRED,
        },
      });
    }

    const expiresAt = new Date(now + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    // 2. Handle Twilio Verify Mode (Twilio handles code generation internally)
    if (channel === OtpChannel.PHONE && smsService.isUsingTwilioVerify()) {
      const smsResult = await smsService.sendOtp(normalizedIdentifier, undefined, purpose);

      await prisma.otpVerification.create({
        data: {
          identifier: normalizedIdentifier,
          channel,
          purpose,
          provider: 'twilio_verify',
          providerRef: smsResult.providerRef || null,
          otpHash: null,
          status: OtpStatus.PENDING,
          attempts: 0,
          maxAttempts: config.OTP_MAX_ATTEMPTS,
          expiresAt,
          lastSentAt: new Date(now),
          ipAddress: ipAddress || null,
        },
      });

      return {
        identifier: normalizedIdentifier,
        channel,
        purpose,
        expiresAt,
        cooldownSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
      };
    }

    // 3. Custom Real OTP Generation for Email or Twilio SMS / Local Secure Mode
    const rawOtp = this.generateSecure6DigitCode();
    const otpHash = this.hashOtp(normalizedIdentifier, rawOtp);

    // Store in test harness strictly during test runs
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      this.testOtpHarness.set(`${normalizedIdentifier}:${purpose}`, rawOtp);
    }

    let providerName = 'local_secure';
    let providerRef: string | null = null;

    if (channel === OtpChannel.EMAIL) {
      const emailResult = await emailService.sendOtpEmail(
        normalizedIdentifier,
        rawOtp,
        purpose === OtpPurpose.LOGIN ? 'Login Verification' : 'Email Verification'
      );
      providerName = emailResult.provider;
      providerRef = emailResult.messageId;
    } else if (channel === OtpChannel.PHONE) {
      const smsResult = await smsService.sendOtp(
        normalizedIdentifier,
        rawOtp,
        purpose === OtpPurpose.LOGIN ? 'Login' : 'Phone Verification'
      );
      providerName = smsResult.provider;
      providerRef = smsResult.providerRef || null;
    }

    // 4. Save hashed record to database
    await prisma.otpVerification.create({
      data: {
        identifier: normalizedIdentifier,
        channel,
        purpose,
        provider: providerName,
        providerRef,
        otpHash,
        status: OtpStatus.PENDING,
        attempts: 0,
        maxAttempts: config.OTP_MAX_ATTEMPTS,
        expiresAt,
        lastSentAt: new Date(now),
        ipAddress: ipAddress || null,
      },
    });

    return {
      identifier: normalizedIdentifier,
      channel,
      purpose,
      expiresAt,
      cooldownSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * Verifies an entered OTP against active records, enforces max attempts, and invalidates on success.
   */
  public async verifyOtp(options: VerifyOtpOptions): Promise<boolean> {
    const purpose = options.purpose || OtpPurpose.LOGIN;
    const rawIdentifier = options.identifier.trim();
    const enteredOtp = options.enteredOtp.trim();

    // Determine channel
    const isEmail = rawIdentifier.includes('@');
    const channel = isEmail ? OtpChannel.EMAIL : OtpChannel.PHONE;
    const normalizedIdentifier = this.normalizeIdentifier(rawIdentifier, channel);

    // 1. Fetch active pending OTP record
    const record = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedIdentifier,
        purpose,
        status: OtpStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw AppError.badRequest('No pending verification code found. Please request a new OTP.');
    }

    // 2. Check Expiration
    const now = Date.now();
    if (now > record.expiresAt.getTime()) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw AppError.badRequest('Verification code has expired. Please request a new OTP.');
    }

    // 3. Check Max Attempts
    if (record.attempts >= record.maxAttempts) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { status: OtpStatus.MAX_ATTEMPTS_EXCEEDED },
      });
      throw AppError.badRequest(
        'Maximum verification attempts exceeded. For your security, this OTP has been locked. Please request a new code.'
      );
    }

    // 4. Verify OTP Code
    let isMatch = false;

    if (record.provider === 'twilio_verify') {
      const verifyResult = await smsService.verifyTwilioOtp(normalizedIdentifier, enteredOtp);
      isMatch = verifyResult.valid;
    } else if (record.otpHash) {
      const enteredHash = this.hashOtp(normalizedIdentifier, enteredOtp);
      isMatch = this.secureCompare(record.otpHash, enteredHash);
    }

    if (!isMatch) {
      const updatedAttempts = record.attempts + 1;
      const remainingAttempts = record.maxAttempts - updatedAttempts;

      if (updatedAttempts >= record.maxAttempts) {
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: {
            attempts: updatedAttempts,
            status: OtpStatus.MAX_ATTEMPTS_EXCEEDED,
          },
        });
        throw AppError.badRequest(
          'Maximum verification attempts exceeded. For your security, this OTP has been locked. Please request a new code.'
        );
      } else {
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: { attempts: updatedAttempts },
        });
        throw AppError.badRequest(
          `Invalid verification code. ${remainingAttempts} attempt${
            remainingAttempts > 1 ? 's' : ''
          } remaining.`
        );
      }
    }

    // 5. Successful Verification: Mark VERIFIED and record timestamp (prevent reuse)
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        status: OtpStatus.VERIFIED,
        verifiedAt: new Date(now),
      },
    });

    return true;
  }

  /**
   * Test Harness helper: Retrieves the dynamically generated OTP strictly when running in test environment.
   */
  public getTestGeneratedOtp(identifier: string, purpose: string = 'LOGIN'): string | null {
    if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
      return null;
    }
    const isEmail = identifier.includes('@');
    const channel = isEmail ? OtpChannel.EMAIL : OtpChannel.PHONE;
    const normalized = this.normalizeIdentifier(identifier, channel);
    return this.testOtpHarness.get(`${normalized}:${purpose}`) || null;
  }

  /**
   * Compatibility helper for existing service calls
   */
  public async generateOtp(
    identifier: string,
    purpose: string = 'LOGIN',
    ipAddress?: string
  ): Promise<{ otp?: string; expiresAt: Date }> {
    const isEmail = identifier.includes('@');
    const channel = isEmail ? OtpChannel.EMAIL : OtpChannel.PHONE;
    const purposeEnum =
      purpose === 'EMAIL_VERIFICATION'
        ? OtpPurpose.EMAIL_VERIFICATION
        : purpose === 'PHONE_VERIFICATION'
        ? OtpPurpose.PHONE_VERIFICATION
        : OtpPurpose.LOGIN;

    const result = await this.generateAndSendOtp({
      identifier,
      channel,
      purpose: purposeEnum,
      ipAddress,
    });

    return { expiresAt: result.expiresAt };
  }
}

export const otpService = new ProductionOtpService();
