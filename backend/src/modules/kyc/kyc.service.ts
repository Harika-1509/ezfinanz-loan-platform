import { ApplicationStage, KycDetails, Application, IdType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { storageService } from '../../shared/services/storage.service';
import { KycSubmissionInput } from './kyc.schema';

export interface KycSubmissionResult {
  kycDetails: KycDetails;
  application: Application;
  message: string;
}

export class KycService {
  /**
   * Submit KYC details and optional ID document photo
   */
  public async submitKyc(
    userId: string,
    input: KycSubmissionInput,
    file?: Express.Multer.File
  ): Promise<KycSubmissionResult> {
    // 1. Fetch user and verify both email and phone are verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User account not found.');
    }

    if (!user.emailVerified || !user.phoneVerified) {
      throw AppError.forbidden(
        'Account verification required. Both email address and mobile phone number must be verified before submitting KYC.'
      );
    }

    // 2. Fetch active loan application
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!application) {
      throw AppError.notFound(
        'No active loan application found. Please initialize an application first.'
      );
    }

    // 3. Handle optional ID document upload
    let idPhotoUrl = input.idPhotoUrl || null;
    if (file) {
      const uploadResult = await storageService.uploadFile(
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        },
        'kyc-documents'
      );
      idPhotoUrl = uploadResult.url;
    }

    // 4. Format and clean ID number
    let cleanedIdNumber = input.idNumber.trim().toUpperCase();
    if (input.idType === IdType.AADHAAR) {
      cleanedIdNumber = cleanedIdNumber.replace(/[\s-]/g, '');
    }

    // 5. Save KYC details and advance application stage in an atomic transaction
    const [savedKyc, updatedApp] = await prisma.$transaction([
      prisma.kycDetails.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          fullName: input.fullName.trim(),
          dob: new Date(input.dob),
          gender: input.gender,
          address: input.address.trim(),
          idType: input.idType,
          idNumber: cleanedIdNumber,
          idPhotoUrl,
        },
        update: {
          fullName: input.fullName.trim(),
          dob: new Date(input.dob),
          gender: input.gender,
          address: input.address.trim(),
          idType: input.idType,
          idNumber: cleanedIdNumber,
          idPhotoUrl: idPhotoUrl || undefined,
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.KYC_SUBMITTED },
      }),
    ]);

    return {
      kycDetails: savedKyc,
      application: updatedApp,
      message: 'KYC details submitted successfully. Application advanced to KYC_SUBMITTED.',
    };
  }

  /**
   * Get current KYC submission and application stage
   */
  public async getKycStatus(userId: string): Promise<{
    application: Application;
    kycDetails: KycDetails | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        kycDetails: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No loan application found.');
    }

    return {
      application,
      kycDetails: application.kycDetails,
    };
  }
}

export const kycService = new KycService();
