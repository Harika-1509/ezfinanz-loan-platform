import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { selfieController } from './selfie.controller';
import { authGuard, stageGuard, upload } from '../../shared/middleware';

const router = Router();

// All Selfie routes require authentication
router.use(authGuard);

router.post(
  '/submit',
  stageGuard(
    ApplicationStage.DECLARATION_CONFIRMED,
    ApplicationStage.SELFIE_PENDING,
    ApplicationStage.WAITING_ADMIN_REVIEW,
    ApplicationStage.REJECTED
  ),
  upload.single('selfie') as any,
  selfieController.submitSelfie
);

router.get('/status', selfieController.getStatus);

export const selfieRoutes = router;
export default router;
