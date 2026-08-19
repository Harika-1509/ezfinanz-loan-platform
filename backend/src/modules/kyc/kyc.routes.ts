import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { kycController } from './kyc.controller';
import { kycSubmissionSchema } from './kyc.schema';
import { authGuard, stageGuard, validate, upload } from '../../shared/middleware';

const router = Router();

// All KYC routes require authentication
router.use(authGuard);

router.post(
  '/submit',
  stageGuard(ApplicationStage.KYC_PENDING),
  upload.single('idPhoto') as any,
  validate(kycSubmissionSchema),
  kycController.submitKyc
);

router.get('/status', kycController.getKycStatus);

export const kycRoutes = router;
export default router;
