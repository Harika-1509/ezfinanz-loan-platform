import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { eligibilityController } from './eligibility.controller';
import { eligibilityCheckSchema } from './eligibility.schema';
import { authGuard, stageGuard, validate } from '../../shared/middleware';

const router = Router();

// All Eligibility routes require authentication
router.use(authGuard);

router.post(
  '/check',
  stageGuard(ApplicationStage.KYC_SUBMITTED, ApplicationStage.ELIGIBILITY_CHECKED),
  validate(eligibilityCheckSchema),
  eligibilityController.checkEligibility
);

router.get('/status', eligibilityController.getEligibilityStatus);

export const eligibilityRoutes = router;
export default router;
