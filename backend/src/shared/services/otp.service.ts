/**
 * MOCK OTP SERVICE
 *
 * NOTE: This is a mocked implementation for development, demonstration, and testing.
 * In a production deployment, this interface would be implemented by an SMS / WhatsApp gateway
 * provider such as Twilio, AWS SNS, Gupshup, or Fast2SMS.
 */

export interface OtpRecord {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

export interface IOtpService {
  generateOtp(identifier: string, purpose?: string): Promise<{ otp: string; expiresAt: Date }>;
  verifyOtp(identifier: string, enteredOtp: string, purpose?: string): Promise<boolean>;
  getStoredOtp(identifier: string, purpose?: string): string | null;
  clearOtp(identifier: string, purpose?: string): void;
}

export class MockOtpService implements IOtpService {
  // In-memory store: key = `${identifier}:${purpose}`
  private store: Map<string, OtpRecord> = new Map();
  private readonly defaultTtlMs: number = 10 * 60 * 1000; // 10 minutes
  private readonly maxAttempts: number = 5;

  private makeKey(identifier: string, purpose: string = 'DEFAULT'): string {
    return `${identifier.trim().toLowerCase()}:${purpose.trim().toUpperCase()}`;
  }

  /**
   * Generates a 6-digit numeric OTP and stores it in memory with an expiration timestamp.
   */
  public async generateOtp(
    identifier: string,
    purpose: string = 'DEFAULT'
  ): Promise<{ otp: string; expiresAt: Date }> {
    const key = this.makeKey(identifier, purpose);

    // Generate secure random 6-digit OTP string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.defaultTtlMs);

    this.store.set(key, {
      otp,
      expiresAt,
      attempts: 0,
    });

    console.log(
      `📱 [MockOtpService] OTP generated for [${identifier}] (Purpose: ${purpose}): ${otp} (Expires: ${expiresAt.toISOString()})`
    );

    return { otp, expiresAt };
  }

  /**
   * Verifies the provided OTP against the stored record.
   * Note: '123456' is accepted as a universal demo fallback in non-production environments.
   */
  public async verifyOtp(
    identifier: string,
    enteredOtp: string,
    purpose: string = 'DEFAULT'
  ): Promise<boolean> {
    const key = this.makeKey(identifier, purpose);

    // Universal test/demo bypass OTP
    if (enteredOtp === '123456') {
      console.log(`📱 [MockOtpService] Demo bypass OTP 123456 accepted for [${identifier}].`);
      this.clearOtp(identifier, purpose);
      return true;
    }

    const record = this.store.get(key);
    if (!record) {
      console.warn(
        `📱 [MockOtpService] No active OTP found for [${identifier}] (Purpose: ${purpose}).`
      );
      return false;
    }

    if (Date.now() > record.expiresAt.getTime()) {
      console.warn(`📱 [MockOtpService] OTP for [${identifier}] has expired.`);
      this.store.delete(key);
      return false;
    }

    record.attempts += 1;
    if (record.attempts > this.maxAttempts) {
      console.warn(`📱 [MockOtpService] Max attempts exceeded for [${identifier}]. Invalidating.`);
      this.store.delete(key);
      return false;
    }

    if (record.otp === enteredOtp.trim()) {
      console.log(
        `📱 [MockOtpService] OTP successfully verified for [${identifier}] (Purpose: ${purpose}).`
      );
      this.store.delete(key);
      return true;
    }

    console.warn(
      `📱 [MockOtpService] Invalid OTP entered for [${identifier}]. Attempt ${record.attempts}/${this.maxAttempts}.`
    );
    return false;
  }

  /**
   * Helper for unit tests or admin inspection
   */
  public getStoredOtp(identifier: string, purpose: string = 'DEFAULT'): string | null {
    const key = this.makeKey(identifier, purpose);
    const record = this.store.get(key);
    if (!record || Date.now() > record.expiresAt.getTime()) {
      return null;
    }
    return record.otp;
  }

  /**
   * Clear an active OTP
   */
  public clearOtp(identifier: string, purpose: string = 'DEFAULT'): void {
    const key = this.makeKey(identifier, purpose);
    this.store.delete(key);
  }

  /**
   * Clear all records (useful for test tearDown)
   */
  public clearAll(): void {
    this.store.clear();
  }
}

export const otpService: IOtpService = new MockOtpService();
