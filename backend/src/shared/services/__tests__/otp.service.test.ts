import { describe, it, expect, beforeEach } from 'vitest';
import { MockOtpService } from '../otp.service';

describe('OtpService', () => {
  let otpService: MockOtpService;

  beforeEach(() => {
    otpService = new MockOtpService();
  });

  it('should generate a 6-digit numeric OTP with an expiration date', async () => {
    const phone = '+919876543210';
    const result = await otpService.generateOtp(phone, 'PHONE_VERIFICATION');

    expect(result.otp).toBeDefined();
    expect(result.otp).toHaveLength(6);
    expect(/^\d{6}$/.test(result.otp)).toBe(true);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should verify the correct OTP', async () => {
    const email = 'user@example.com';
    const { otp } = await otpService.generateOtp(email, 'EMAIL_VERIFICATION');

    const isValid = await otpService.verifyOtp(email, otp, 'EMAIL_VERIFICATION');
    expect(isValid).toBe(true);

    // After verification, OTP should be cleared
    const isReused = await otpService.verifyOtp(email, otp, 'EMAIL_VERIFICATION');
    expect(isReused).toBe(false);
  });

  it('should reject an incorrect OTP', async () => {
    const phone = '+919876543210';
    await otpService.generateOtp(phone, 'PHONE_VERIFICATION');

    const isValid = await otpService.verifyOtp(phone, '000000', 'PHONE_VERIFICATION');
    expect(isValid).toBe(false);
  });

  it('should accept universal demo test OTP 123456', async () => {
    const phone = '+919999999999';
    const isValid = await otpService.verifyOtp(phone, '123456', 'PHONE_VERIFICATION');
    expect(isValid).toBe(true);
  });

  it('should invalidate after maximum failed attempts', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOtp(email, 'LOGIN');

    for (let i = 0; i < 5; i++) {
      await otpService.verifyOtp(email, '999999', 'LOGIN');
    }

    // 6th attempt with wrong OTP clears it
    await otpService.verifyOtp(email, '999999', 'LOGIN');

    // Even with correct OTP, it should now fail
    const isValidAfterExceeded = await otpService.verifyOtp(email, otp, 'LOGIN');
    expect(isValidAfterExceeded).toBe(false);
  });
});
