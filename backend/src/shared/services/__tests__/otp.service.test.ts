import { describe, it, expect, beforeEach } from 'vitest';
import { OtpChannel, OtpPurpose, OtpStatus } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { otpService } from '../otp.service';
import { smsService } from '../sms.service';

describe('ProductionOtpService', () => {
  const testPhone = '+919876543210';
  const testEmail = 'otp_production_test@example.com';

  beforeEach(async () => {
    // Clear test records
    await prisma.otpVerification.deleteMany({
      where: {
        identifier: {
          in: [
            testPhone,
            testEmail,
            '+919999999999',
            '+919876500001',
            '+919876500002',
            '+919876500003',
            'cooldown_test@example.com',
            'lockout_test@example.com',
            'reuse_test@example.com',
          ],
        },
      },
    });
  });

  it('should generate a 6-digit numeric OTP and store SHA-256 hashed record in DB', async () => {
    const result = await otpService.generateAndSendOtp({
      identifier: testPhone,
      channel: OtpChannel.PHONE,
      purpose: OtpPurpose.PHONE_VERIFICATION,
    });

    expect(result.identifier).toBe(testPhone);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.cooldownSeconds).toBe(10);

    // Verify DB record
    const dbRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: testPhone,
        purpose: OtpPurpose.PHONE_VERIFICATION,
        status: OtpStatus.PENDING,
      },
    });

    expect(dbRecord).toBeDefined();
    expect(dbRecord?.otpHash).toBeDefined();
    expect(dbRecord?.otpHash).toHaveLength(64); // SHA-256 hex string
    expect(dbRecord?.status).toBe(OtpStatus.PENDING);
    expect(dbRecord?.attempts).toBe(0);
  });

  it('should verify the correct dynamically generated OTP and mark it VERIFIED', async () => {
    await otpService.generateAndSendOtp({
      identifier: testEmail,
      channel: OtpChannel.EMAIL,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });

    const dynamicOtp = otpService.getTestGeneratedOtp(testEmail, OtpPurpose.EMAIL_VERIFICATION);
    expect(dynamicOtp).toBeDefined();
    expect(dynamicOtp).toHaveLength(6);

    const isValid = await otpService.verifyOtp({
      identifier: testEmail,
      enteredOtp: dynamicOtp!,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });

    expect(isValid).toBe(true);

    // Verify DB record status is updated to VERIFIED
    const dbRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: testEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(dbRecord?.status).toBe(OtpStatus.VERIFIED);
    expect(dbRecord?.verifiedAt).toBeDefined();
  });

  it('should strictly reject fake bypass OTP 123456', async () => {
    await otpService.generateAndSendOtp({
      identifier: testPhone,
      channel: OtpChannel.PHONE,
      purpose: OtpPurpose.PHONE_VERIFICATION,
    });

    const realOtp = otpService.getTestGeneratedOtp(testPhone, OtpPurpose.PHONE_VERIFICATION);

    // Only test if the randomly generated OTP is not coincidentally 123456
    if (realOtp !== '123456') {
      await expect(
        otpService.verifyOtp({
          identifier: testPhone,
          enteredOtp: '123456',
          purpose: OtpPurpose.PHONE_VERIFICATION,
        })
      ).rejects.toThrow(/Invalid verification code/);
    }
  });

  it('should reject incorrect OTP and decrement remaining attempts', async () => {
    await otpService.generateAndSendOtp({
      identifier: testPhone,
      channel: OtpChannel.PHONE,
      purpose: OtpPurpose.PHONE_VERIFICATION,
    });

    await expect(
      otpService.verifyOtp({
        identifier: testPhone,
        enteredOtp: '000000',
        purpose: OtpPurpose.PHONE_VERIFICATION,
      })
    ).rejects.toThrow(/9 attempts remaining/);

    const dbRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: testPhone,
        purpose: OtpPurpose.PHONE_VERIFICATION,
        status: OtpStatus.PENDING,
      },
    });

    expect(dbRecord?.attempts).toBe(1);
  });

  it('should lock out and invalidate after 10 failed attempts', async () => {
    const lockoutEmail = 'lockout_test@example.com';
    await otpService.generateAndSendOtp({
      identifier: lockoutEmail,
      channel: OtpChannel.EMAIL,
      purpose: OtpPurpose.LOGIN,
    });

    const realOtp = otpService.getTestGeneratedOtp(lockoutEmail, OtpPurpose.LOGIN);

    // Attempt 1 to 9: Failures with attempts remaining
    for (let i = 1; i <= 9; i++) {
      await expect(
        otpService.verifyOtp({
          identifier: lockoutEmail,
          enteredOtp: '111111',
          purpose: OtpPurpose.LOGIN,
        })
      ).rejects.toThrow();
    }

    // 10th attempt: Exceeds max attempts
    await expect(
      otpService.verifyOtp({
        identifier: lockoutEmail,
        enteredOtp: '111111',
        purpose: OtpPurpose.LOGIN,
      })
    ).rejects.toThrow(/Maximum.*exceeded/);

    // Even with the correct OTP, verification is now rejected
    await expect(
      otpService.verifyOtp({
        identifier: lockoutEmail,
        enteredOtp: realOtp!,
        purpose: OtpPurpose.LOGIN,
      })
    ).rejects.toThrow(/Maximum.*exceeded|temporarily locked|No pending verification/);

    const dbRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: lockoutEmail,
        purpose: OtpPurpose.LOGIN,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(dbRecord?.status).toBe(OtpStatus.MAX_ATTEMPTS_EXCEEDED);
  });

  it('should enforce 60-second resend cooldown before allowing another dispatch', async () => {
    const cooldownEmail = 'cooldown_test@example.com';

    await otpService.generateAndSendOtp({
      identifier: cooldownEmail,
      channel: OtpChannel.EMAIL,
      purpose: OtpPurpose.LOGIN,
    });

    // Immediate second request must be blocked by cooldown
    await expect(
      otpService.generateAndSendOtp({
        identifier: cooldownEmail,
        channel: OtpChannel.EMAIL,
        purpose: OtpPurpose.LOGIN,
      })
    ).rejects.toThrow(/Please wait \d+ seconds before requesting another OTP/);
  });

  it('should prevent reuse of already verified OTPs', async () => {
    const reuseEmail = 'reuse_test@example.com';

    await otpService.generateAndSendOtp({
      identifier: reuseEmail,
      channel: OtpChannel.EMAIL,
      purpose: OtpPurpose.LOGIN,
    });

    const realOtp = otpService.getTestGeneratedOtp(reuseEmail, OtpPurpose.LOGIN);

    // First verification: Success
    const firstVerify = await otpService.verifyOtp({
      identifier: reuseEmail,
      enteredOtp: realOtp!,
      purpose: OtpPurpose.LOGIN,
    });
    expect(firstVerify).toBe(true);

    // Second verification attempt with same OTP: Blocked
    await expect(
      otpService.verifyOtp({
        identifier: reuseEmail,
        enteredOtp: realOtp!,
        purpose: OtpPurpose.LOGIN,
      })
    ).rejects.toThrow(/No pending verification code found/);
  });

  it('should normalize 10-digit Indian mobile numbers to E.164 format', () => {
    expect(smsService.normalizeToE164('9876543210')).toBe('+919876543210');
    expect(smsService.normalizeToE164('+919876543210')).toBe('+919876543210');
    expect(smsService.normalizeToE164('+14155552671')).toBe('+14155552671');
  });
});
