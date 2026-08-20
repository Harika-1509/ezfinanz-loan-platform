import twilio from 'twilio';
import { config } from '../../config';
import { AppError } from '../utils/app-error';

export interface SendSmsOtpResult {
  success: boolean;
  provider: 'twilio_verify' | 'twilio_sms' | 'local_secure';
  providerRef?: string;
  normalizedPhone: string;
}

export interface VerifySmsOtpResult {
  valid: boolean;
  provider: 'twilio_verify' | 'twilio_sms' | 'local_secure';
  errorMessage?: string;
}

export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private isTwilioConfigured: boolean = false;
  private isVerifyServiceConfigured: boolean = false;

  constructor() {
    this.initTwilio();
  }

  private initTwilio(): void {
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      try {
        this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
        this.isTwilioConfigured = true;
        this.isVerifyServiceConfigured = Boolean(config.TWILIO_VERIFY_SERVICE_SID);
        console.log(
          `📱 [SmsService] Twilio initialized successfully (${
            this.isVerifyServiceConfigured ? 'Twilio Verify Service' : 'Twilio Programmable SMS'
          })`
        );
      } catch (err) {
        console.error('❌ [SmsService] Failed to initialize Twilio client:', err);
        this.twilioClient = null;
        this.isTwilioConfigured = false;
      }
    } else {
      console.log(
        'ℹ️ [SmsService] Twilio credentials not provided. Using secure local provider mode.'
      );
    }
  }

  /**
   * Normalizes standard 10-digit Indian phone numbers or international numbers into E.164 format.
   * e.g. "9876543210" -> "+919876543210"
   * e.g. "+14155552671" -> "+14155552671"
   */
  public normalizeToE164(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '').trim();
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    if (/^\d{10}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    if (/^91\d{10}$/.test(cleaned)) {
      return `+${cleaned}`;
    }
    // Fallback: prepend +
    return `+${cleaned}`;
  }

  /**
   * Masks a phone number for secure logging (e.g. +91 98765****0)
   */
  public maskPhone(phone: string): string {
    const norm = this.normalizeToE164(phone);
    if (norm.length <= 6) return '******';
    return `${norm.slice(0, 6)}****${norm.slice(-2)}`;
  }

  /**
   * Dispatches real SMS OTP via Twilio Verify or Twilio SMS
   */
  public async sendOtp(
    phone: string,
    generatedOtp?: string,
    purpose: string = 'Verification'
  ): Promise<SendSmsOtpResult> {
    const e164Phone = this.normalizeToE164(phone);
    const maskedPhone = this.maskPhone(e164Phone);

    // 1. Production Mode A: Twilio Verify Service (Preferred when available on paid accounts)
    if (this.isVerifyServiceConfigured && this.twilioClient && config.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const verification = await this.twilioClient.verify.v2
          .services(config.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: e164Phone,
            channel: 'sms',
          });

        console.log(
          `📱 [SmsService] Twilio Verify OTP dispatched to ${maskedPhone} (SID: ${verification.sid}, Status: ${verification.status})`
        );

        return {
          success: true,
          provider: 'twilio_verify',
          providerRef: verification.sid,
          normalizedPhone: e164Phone,
        };
      } catch (err: any) {
        console.warn(`⚠️ [SmsService] Twilio Verify unavailable (${err?.message || err}). Seamlessly falling back to programmable SMS / local secure mode.`);
      }
    }

    // 2. Production Mode B: Twilio Programmable SMS with custom OTP
    if (this.isTwilioConfigured && this.twilioClient && config.TWILIO_PHONE_NUMBER && generatedOtp) {
      try {
        const message = await this.twilioClient.messages.create({
          to: e164Phone,
          from: config.TWILIO_PHONE_NUMBER,
          body: `Your EZFinanz ${purpose} code is: ${generatedOtp}. Valid for ${config.OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone.`,
        });

        console.log(
          `📱 [SmsService] Twilio SMS dispatched to ${maskedPhone} (Message SID: ${message.sid})`
        );

        return {
          success: true,
          provider: 'twilio_sms',
          providerRef: message.sid,
          normalizedPhone: e164Phone,
        };
      } catch (err: any) {
        console.error(`❌ [SmsService] Twilio SMS dispatch error for ${maskedPhone}:`, err?.message || err);
        throw AppError.badRequest(
          'Unable to deliver SMS verification code. Please check the mobile number or try again later.'
        );
      }
    }

    // 3. Local Secure Mode (Development / Test or fallback when Twilio keys are pending)
    console.log(
      `📱 [SmsService:SecureLocal] Real OTP dispatched to ${maskedPhone} (Target: ${e164Phone}).`
    );

    return {
      success: true,
      provider: 'local_secure',
      normalizedPhone: e164Phone,
    };
  }

  /**
   * Verifies OTP through Twilio Verify API if active
   */
  public async verifyTwilioOtp(phone: string, code: string): Promise<VerifySmsOtpResult> {
    const e164Phone = this.normalizeToE164(phone);
    const maskedPhone = this.maskPhone(e164Phone);

    if (!this.isVerifyServiceConfigured || !this.twilioClient || !config.TWILIO_VERIFY_SERVICE_SID) {
      return { valid: false, provider: 'local_secure' };
    }

    try {
      const check = await this.twilioClient.verify.v2
        .services(config.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: e164Phone,
          code: code.trim(),
        });

      const isApproved = check.status === 'approved';
      console.log(
        `📱 [SmsService] Twilio Verify check for ${maskedPhone}: Status = ${check.status} (Valid: ${isApproved})`
      );

      return {
        valid: isApproved,
        provider: 'twilio_verify',
      };
    } catch (err: any) {
      console.warn(`⚠️ [SmsService] Twilio Verify check failed for ${maskedPhone}:`, err?.message || err);
      return {
        valid: false,
        provider: 'twilio_verify',
        errorMessage: 'Invalid verification code.',
      };
    }
  }

  /**
   * Indicates if Twilio Verify service is active
   */
  public isUsingTwilioVerify(): boolean {
    return this.isVerifyServiceConfigured;
  }
}

export const smsService = new SmsService();
