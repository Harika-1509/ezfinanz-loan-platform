import { ApplicationStage, OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { otpService } from '../../shared/services/otp.service';

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
    emailOverride?: string,
    ipAddress?: string
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

    // Generate & dispatch real OTP via ProductionOtpService
    const result = await otpService.generateAndSendOtp({
      identifier: targetEmail,
      channel: OtpChannel.EMAIL,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      ipAddress,
    });

    return {
      target: result.identifier,
      expiresAt: result.expiresAt,
      message: `Verification OTP has been sent to ${result.identifier}. Valid for 10 minutes.`,
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

    // Verify OTP through production engine
    await otpService.verifyOtp({
      identifier: targetEmail,
      enteredOtp: otp,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });

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
    phoneInput?: string,
    ipAddress?: string
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

    // Generate & dispatch real SMS OTP via ProductionOtpService
    const result = await otpService.generateAndSendOtp({
      identifier: targetPhone,
      channel: OtpChannel.PHONE,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      ipAddress,
    });

    return {
      target: result.identifier,
      expiresAt: result.expiresAt,
      message: `Verification OTP has been sent to mobile number ${result.identifier}. Valid for 10 minutes.`,
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

    // Verify OTP through production engine
    await otpService.verifyOtp({
      identifier: targetPhone,
      enteredOtp: otp,
      purpose: OtpPurpose.PHONE_VERIFICATION,
    });

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
