import { ApplicationStage } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { otpService } from '../../shared/services/otp.service';
import { emailService } from '../../shared/services/email.service';

export interface VerificationStatusResponse {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  isFullyVerified: boolean;
  canProceedToKyc: boolean;
  currentApplicationStage?: ApplicationStage;
}

export class VerificationService {
  /**
   * Dispatches a 6-digit verification OTP to the user's email address
   */
  public async sendEmailOtp(
    userId: string,
    emailOverride?: string
  ): Promise<{ target: string; expiresAt: Date; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    const targetEmail = (emailOverride || user.email)?.toLowerCase().trim();
    if (!targetEmail) {
      throw AppError.badRequest('An email address is required to send verification OTP.');
    }

    if (user.emailVerified && user.email?.toLowerCase() === targetEmail) {
      throw AppError.badRequest('Email address is already verified.');
    }

    // Check email uniqueness if emailOverride is a new email
    if (emailOverride && user.email && emailOverride.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: emailOverride.toLowerCase() },
      });
      if (existing && existing.id !== userId) {
        throw AppError.conflict('An account with this email address already exists.');
      }
    }

    // Generate 6-digit OTP using OtpService abstraction
    const { otp, expiresAt } = await otpService.generateOtp(targetEmail, 'EMAIL_VERIFICATION');

    // Deliver OTP via EmailService abstraction
    await emailService.sendEmail({
      to: targetEmail,
      subject: 'EZFinanz - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0284c7;">EZFinanz Loan Platform</h2>
          <p>Your one-time verification code for your email address is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f172a; padding: 12px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return {
      target: targetEmail,
      expiresAt,
      message: 'Verification OTP has been successfully sent to your email address.',
    };
  }

  /**
   * Verifies the email OTP and updates users.email_verified
   */
  public async verifyEmailOtp(
    userId: string,
    otp: string,
    emailOverride?: string
  ): Promise<{
    emailVerified: boolean;
    phoneVerified: boolean;
    applicationStage?: ApplicationStage;
    message: string;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    const targetEmail = (emailOverride || user.email)?.toLowerCase().trim();
    if (!targetEmail) {
      throw AppError.badRequest('No email address associated with this account to verify.');
    }

    // Verify OTP
    const isValid = await otpService.verifyOtp(targetEmail, otp, 'EMAIL_VERIFICATION');
    if (!isValid) {
      throw AppError.badRequest('Invalid or expired email verification OTP.');
    }

    // Update database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: targetEmail,
        emailVerified: true,
      },
    });

    // Advance application if dual verification is achieved
    const updatedApp = await this.advanceApplicationIfVerified(
      userId,
      true,
      updatedUser.phoneVerified
    );

    return {
      emailVerified: true,
      phoneVerified: updatedUser.phoneVerified,
      applicationStage: updatedApp?.stage,
      message: 'Email address successfully verified.',
    };
  }

  /**
   * Dispatches a 6-digit verification OTP to the user's mobile number
   */
  public async sendPhoneOtp(
    userId: string,
    phoneInput?: string
  ): Promise<{ target: string; expiresAt: Date; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    const targetPhone = (phoneInput || user.phone)?.trim();
    if (!targetPhone) {
      throw AppError.badRequest(
        'A valid mobile phone number is required to send verification OTP.'
      );
    }

    if (user.phoneVerified && user.phone === targetPhone) {
      throw AppError.badRequest('Mobile phone number is already verified.');
    }

    // Check phone uniqueness if phone is changing
    if (phoneInput && phoneInput !== user.phone) {
      const existing = await prisma.user.findUnique({
        where: { phone: phoneInput },
      });
      if (existing && existing.id !== userId) {
        throw AppError.conflict('An account with this mobile phone number already exists.');
      }

      // Save new phone number to profile
      await prisma.user.update({
        where: { id: userId },
        data: { phone: phoneInput, phoneVerified: false },
      });
    }

    // Generate 6-digit OTP using OtpService abstraction
    const { expiresAt } = await otpService.generateOtp(targetPhone, 'PHONE_VERIFICATION');

    return {
      target: targetPhone,
      expiresAt,
      message: 'Verification OTP has been sent to your mobile phone number.',
    };
  }

  /**
   * Verifies the phone OTP and updates users.phone_verified
   */
  public async verifyPhoneOtp(
    userId: string,
    otp: string,
    phoneInput?: string
  ): Promise<{
    emailVerified: boolean;
    phoneVerified: boolean;
    applicationStage?: ApplicationStage;
    message: string;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    const targetPhone = (phoneInput || user.phone)?.trim();
    if (!targetPhone) {
      throw AppError.badRequest('No phone number associated with this account to verify.');
    }

    // Verify OTP
    const isValid = await otpService.verifyOtp(targetPhone, otp, 'PHONE_VERIFICATION');
    if (!isValid) {
      throw AppError.badRequest('Invalid or expired mobile verification OTP.');
    }

    // Update database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: targetPhone,
        phoneVerified: true,
      },
    });

    // Advance application if dual verification is achieved
    const updatedApp = await this.advanceApplicationIfVerified(
      userId,
      updatedUser.emailVerified,
      true
    );

    return {
      emailVerified: updatedUser.emailVerified,
      phoneVerified: true,
      applicationStage: updatedApp?.stage,
      message: 'Mobile phone number successfully verified.',
    };
  }

  /**
   * Gets current verification status for authenticated customer
   */
  public async getVerificationStatus(userId: string): Promise<VerificationStatusResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found.');
    }

    const activeApp = user.applications[0];
    const isFullyVerified = user.emailVerified && user.phoneVerified;

    return {
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      isFullyVerified,
      canProceedToKyc: isFullyVerified,
      currentApplicationStage: activeApp?.stage,
    };
  }

  /**
   * Helper: If both email and phone are verified, advances initial application stage to KYC_PENDING
   */
  private async advanceApplicationIfVerified(
    userId: string,
    emailVerified: boolean,
    phoneVerified: boolean
  ) {
    if (!emailVerified || !phoneVerified) {
      return null;
    }

    const activeApp = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeApp) {
      return null;
    }

    // If at initial signup stage or verification stage, advance to KYC_PENDING
    if (
      activeApp.stage === ApplicationStage.SIGNUP_COMPLETED ||
      activeApp.stage === ApplicationStage.VERIFICATION_PENDING ||
      activeApp.stage === ApplicationStage.VERIFIED
    ) {
      return await prisma.application.update({
        where: { id: activeApp.id },
        data: { stage: ApplicationStage.KYC_PENDING },
      });
    }

    return activeApp;
  }
}

export const verificationService = new VerificationService();
