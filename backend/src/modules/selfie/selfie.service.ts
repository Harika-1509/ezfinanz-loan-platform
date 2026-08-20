import {
  ApplicationStage,
  AdminReviewStatus,
  Selfie,
  Application,
} from '@prisma/client';
import { prisma } from '../../prisma/client';
import { storageService } from '../../shared/services';
import { AppError } from '../../shared/utils/app-error';

export interface SubmitSelfieOptions {
  file?: Express.Multer.File;
  base64Data?: string;
}

export interface SelfieResponse {
  selfie: Selfie;
  application: Application;
  message: string;
}

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class SelfieService {
  /**
   * Submit selfie photo (multipart file or base64) and advance stage to WAITING_ADMIN_REVIEW
   */
  public async submitSelfie(
    userId: string,
    options: SubmitSelfieOptions
  ): Promise<SelfieResponse> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        declaration: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    if (!application.declaration) {
      throw AppError.badRequest(
        'Loan terms declaration must be accepted before submitting a verification selfie.'
      );
    }

    let buffer: Buffer;
    let mimetype: string;
    let originalname: string;

    if (options.file) {
      mimetype = options.file.mimetype.toLowerCase();

      if (!ALLOWED_IMAGE_MIMES.includes(mimetype)) {
        throw AppError.badRequest(
          `Invalid file format: ${options.file.mimetype}. Only JPEG, PNG, and WEBP images are supported for selfies.`
        );
      }

      if (options.file.size > MAX_IMAGE_SIZE_BYTES) {
        throw AppError.badRequest(
          `File size exceeds maximum allowed limit of 5MB.`
        );
      }

      buffer = options.file.buffer;
      originalname = options.file.originalname;
    } else if (options.base64Data && options.base64Data.trim().length > 0) {
      const dataStr = options.base64Data.trim();
      const match = dataStr.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);

      if (match) {
        mimetype = match[1].toLowerCase();
        if (!ALLOWED_IMAGE_MIMES.includes(mimetype)) {
          throw AppError.badRequest(
            `Invalid image type: ${mimetype}. Only JPEG, PNG, and WEBP images are supported for selfies.`
          );
        }
        buffer = Buffer.from(match[2], 'base64');
      } else {
        // Raw base64 string
        mimetype = 'image/jpeg';
        buffer = Buffer.from(dataStr, 'base64');
      }

      if (buffer.length === 0) {
        throw AppError.badRequest('Invalid or corrupted base64 image data.');
      }

      if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw AppError.badRequest(
          `Image payload exceeds maximum allowed limit of 5MB.`
        );
      }

      const ext = mimetype.includes('png')
        ? '.png'
        : mimetype.includes('webp')
        ? '.webp'
        : '.jpg';
      originalname = `selfie_${Date.now()}${ext}`;
    } else {
      throw AppError.badRequest(
        'Selfie photo is required. Upload an image file or provide a base64 encoded image string.'
      );
    }

    // Upload to local / cloud storage
    const uploadResult = await storageService.uploadFile(
      {
        buffer,
        originalname,
        mimetype,
      },
      'selfies'
    );

    // Save to database & advance lifecycle stage
    const [savedSelfie, updatedApp] = await prisma.$transaction([
      prisma.selfie.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          photoUrl: uploadResult.url,
          adminStatus: AdminReviewStatus.PENDING,
          submittedAt: new Date(),
        },
        update: {
          photoUrl: uploadResult.url,
          adminStatus: AdminReviewStatus.PENDING,
          submittedAt: new Date(),
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.WAITING_ADMIN_REVIEW },
      }),
    ]);

    return {
      selfie: savedSelfie,
      application: updatedApp,
      message:
        'Selfie photo submitted successfully. Loan application is now Waiting for Admin Review.',
    };
  }

  /**
   * Retrieve active selfie submission status
   */
  public async getSelfieStatus(userId: string): Promise<{
    application: Application;
    selfie: Selfie | null;
  }> {
    const application = await prisma.application.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        selfie: true,
      },
    });

    if (!application) {
      throw AppError.notFound('No active loan application found.');
    }

    return {
      application,
      selfie: application.selfie,
    };
  }
}

export const selfieService = new SelfieService();
