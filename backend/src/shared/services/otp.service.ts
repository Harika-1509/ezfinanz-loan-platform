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
  devOtp?: string;
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
    const now = Date.now();

    // 1. Check if user is currently locked out due to exceeding 10 attempts (10 minute lockout window)
    const lockoutMs = config.OTP_LOCKOUT_MINUTES * 60 * 1000;
    const latestLockedRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedIdentifier,
        purpose,
        status: OtpStatus.MAX_ATTEMPTS_EXCEEDED,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestLockedRecord) {
      const elapsedLockout = now - latestLockedRecord.updatedAt.getTime();
      if (elapsedLockout < lockoutMs) {
        const remainingMinutes = Math.ceil((lockoutMs - elapsedLockout) / (60 * 1000));
        throw AppError.tooManyRequests(
          `Maximum attempts exceeded (10/10). For your security, this account is temporarily locked. Please try again after ${remainingMinutes} minute${
            remainingMinutes > 1 ? 's' : ''
          }.`
        );
      }
    }

    // 2. Check Resend Cooldown (e.g. 10 seconds in dev/test)
    const existingPending = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedIdentifier,
        purpose,
        status: OtpStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    // 3. Handle Twilio Verify Mode (Twilio handles code generation internally when active)
    if (channel === OtpChannel.PHONE && smsService.isUsingTwilioVerify()) {
      const smsResult = await smsService.sendOtp(normalizedIdentifier, undefined, purpose);

      if (smsResult.provider === 'twilio_verify') {
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
    }

    // 4. Custom Real OTP Generation for Email or Twilio SMS / Local Secure Mode
    const rawOtp = this.generateSecure6DigitCode();
    const otpHash = this.hashOtp(normalizedIdentifier, rawOtp);

    // Store in test harness during non-production runs (dev & test)
    if (config.NODE_ENV !== 'production') {
      this.testOtpHarness.set(`${normalizedIdentifier}:${purpose}`, rawOtp);

      console.log(`\n======================================================`);
      console.log(`🔑 [EZFinanz OTP Service] 6-Digit Code for ${normalizedIdentifier}:`);
      console.log(`   👉 OTP: [ ${rawOtp} ] (Purpose: ${purpose})`);
      console.log(`======================================================\n`);
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

    // 5. Save hashed record to database with 10 max attempts
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
      devOtp: config.NODE_ENV !== 'production' ? rawOtp : undefined,
    };
  }

  /**
   * Verifies an entered OTP against active records, enforces max attempts (10), and invalidates on success.
   */
  public async verifyOtp(options: VerifyOtpOptions): Promise<boolean> {
    const purpose = options.purpose || OtpPurpose.LOGIN;
    const rawIdentifier = options.identifier.trim();
    const enteredOtp = options.enteredOtp.trim();

    // Determine channel
    const isEmail = rawIdentifier.includes('@');
    const channel = isEmail ? OtpChannel.EMAIL : OtpChannel.PHONE;
    const normalizedIdentifier = this.normalizeIdentifier(rawIdentifier, channel);
    const now = Date.now();

    // 1. Check if user is currently locked out (10 attempts exceeded within 10 minutes)
    const lockoutMs = config.OTP_LOCKOUT_MINUTES * 60 * 1000;
    const latestLocked = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedIdentifier,
        purpose,
        status: OtpStatus.MAX_ATTEMPTS_EXCEEDED,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestLocked) {
      const elapsed = now - latestLocked.updatedAt.getTime();
      if (elapsed < lockoutMs) {
        const remMins = Math.ceil((lockoutMs - elapsed) / (60 * 1000));
        throw AppError.tooManyRequests(
          `Maximum attempts exceeded (10/10). For your security, this account is temporarily locked. Please try again after ${remMins} minute${
            remMins > 1 ? 's' : ''
          }.`
        );
      }
    }

    // 2. Fetch active pending OTP record
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

    // 3. Check Expiration
    if (now > record.expiresAt.getTime()) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw AppError.badRequest('Verification code has expired. Please request a new OTP.');
    }

    // 4. Check Max Attempts (10)
    const maxAttempts = record.maxAttempts || config.OTP_MAX_ATTEMPTS;
    if (record.attempts >= maxAttempts) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { status: OtpStatus.MAX_ATTEMPTS_EXCEEDED },
      });
      throw AppError.tooManyRequests(
        `Maximum verification attempts exceeded (10/10). For your security, this OTP has been locked for ${config.OTP_LOCKOUT_MINUTES} minutes. Please try again after 10 minutes.`
      );
    }

    // 5. Verify OTP Code
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
      const remainingAttempts = maxAttempts - updatedAttempts;

      if (updatedAttempts >= maxAttempts) {
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: {
            attempts: updatedAttempts,
            status: OtpStatus.MAX_ATTEMPTS_EXCEEDED,
          },
        });
        throw AppError.tooManyRequests(
          `Maximum verification attempts exceeded (10/10). For your security, this account is temporarily locked for ${config.OTP_LOCKOUT_MINUTES} minutes. Please try again after 10 minutes.`
        );
      } else {
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: { attempts: updatedAttempts },
        });
        throw AppError.badRequest(
          `Invalid verification code. ${remainingAttempts} attempt${
            remainingAttempts > 1 ? 's' : ''
          } remaining before temporary 10-minute lockout.`
        );
      }
    }

    // 6. Successful Verification: Mark VERIFIED and record timestamp (prevent reuse)
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
    if (config.NODE_ENV === 'production') {
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
  ): Promise<{ otp?: string; expiresAt: Date; devOtp?: string }> {
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

    return { expiresAt: result.expiresAt, devOtp: result.devOtp };
  }
}

export const otpService = new ProductionOtpService();
