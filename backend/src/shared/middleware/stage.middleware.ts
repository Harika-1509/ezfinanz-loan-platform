import { Request, Response, NextFunction } from 'express';
import { ApplicationStage, Application } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { AppError } from '../utils/app-error';

// Augment Express Request interface with application entity
declare global {
  namespace Express {
    interface Request {
      application?: Application;
    }
  }
}

/**
 * Standard ordered progression of loan application lifecycle
 */
export const STAGE_PROGRESSION: ApplicationStage[] = [
  ApplicationStage.SIGNUP_COMPLETED,
  ApplicationStage.VERIFICATION_PENDING,
  ApplicationStage.VERIFIED,
  ApplicationStage.KYC_PENDING,
  ApplicationStage.KYC_SUBMITTED,
  ApplicationStage.ELIGIBILITY_CHECKED,
  ApplicationStage.EMI_SELECTED,
  ApplicationStage.BANK_ADDED,
  ApplicationStage.DECLARATION_CONFIRMED,
  ApplicationStage.SELFIE_PENDING,
  ApplicationStage.WAITING_ADMIN_REVIEW,
  ApplicationStage.APPROVED,
  ApplicationStage.DISBURSED,
];

/**
 * Stage Validation Helper: Checks if transitioning from `fromStage` to `toStage` is permitted.
 */
export function canTransitionStage(
  fromStage: ApplicationStage,
  toStage: ApplicationStage
): boolean {
  // Allow terminal rejection from any non-disbursed stage
  if (toStage === ApplicationStage.REJECTED && fromStage !== ApplicationStage.DISBURSED) {
    return true;
  }

  const fromIndex = STAGE_PROGRESSION.indexOf(fromStage);
  const toIndex = STAGE_PROGRESSION.indexOf(toStage);

  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }

  // Next step must immediately follow or be equivalent progression step
  return toIndex === fromIndex + 1 || toIndex === fromIndex;
}

/**
 * Stage Guard Middleware
 *
 * Ensures an application exists, belongs to the authenticated user (or user is ADMIN),
 * is in one of the allowed lifecycle stages, and enforces that both email_verified and phone_verified
 * are completed before proceeding to KYC or later stages.
 *
 * @param allowedStages - List of ApplicationStage values in which the endpoint is permitted
 */
export const stageGuard = (...allowedStages: ApplicationStage[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required before verifying application stage.');
      }

      // Resolve application ID from params, body, query, or active user application
      const applicationId =
        req.params.applicationId ||
        req.params.id ||
        req.body?.applicationId ||
        (req.query?.applicationId as string | undefined);

      let application: Application | null = null;

      if (applicationId) {
        application = await prisma.application.findUnique({
          where: { id: applicationId },
        });
      } else {
        // Find most recent application for current user
        application = await prisma.application.findFirst({
          where: { userId: req.user.userId },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!application) {
        throw AppError.notFound(
          'Loan application not found. Please initiate an application first.'
        );
      }

      // Authorization check: Customer can only access their own application
      if (req.user.role !== 'ADMIN' && application.userId !== req.user.userId) {
        throw AppError.forbidden('You are not authorized to view or modify this loan application.');
      }

      // Verification check: Non-admin users must have both email and phone verified before KYC or beyond
      if (req.user.role !== 'ADMIN') {
        const kycThresholdIndex = STAGE_PROGRESSION.indexOf(ApplicationStage.KYC_PENDING);
        const requiresVerification = allowedStages.some((st) => {
          const idx = STAGE_PROGRESSION.indexOf(st);
          return idx >= kycThresholdIndex;
        });

        if (requiresVerification) {
          const userRecord = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { emailVerified: true, phoneVerified: true },
          });

          if (!userRecord || !userRecord.emailVerified || !userRecord.phoneVerified) {
            throw AppError.forbidden(
              'Account verification required. You must verify both your email address and mobile phone number before proceeding with KYC.'
            );
          }
        }
      }

      // Stage check
      if (allowedStages.length > 0 && !allowedStages.includes(application.stage)) {
        throw AppError.badRequest(
          `Invalid application state. The current application is at stage '${application.stage}', but this action requires one of: [${allowedStages.join(', ')}].`
        );
      }

      // Attach resolved application to request for downstream controller handlers
      req.application = application;

      next();
    } catch (error) {
      next(error);
    }
  };
};
