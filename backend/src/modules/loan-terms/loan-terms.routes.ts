import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { loanTermsController } from './loan-terms.controller';
import {
  loanTermsCalculationSchema,
  loanTermsConfirmSchema,
} from './loan-terms.schema';
import { authGuard, stageGuard, validate } from '../../shared/middleware';

const router = Router();

// All Loan Terms routes require authentication
router.use(authGuard);

router.post(
  '/calculate',
  stageGuard(ApplicationStage.ELIGIBILITY_CHECKED, ApplicationStage.EMI_SELECTED),
  validate(loanTermsCalculationSchema),
  loanTermsController.calculateTerms
);

router.post(
  '/confirm',
  stageGuard(ApplicationStage.ELIGIBILITY_CHECKED, ApplicationStage.EMI_SELECTED),
  validate(loanTermsConfirmSchema),
  loanTermsController.confirmTerms
);

router.get('/options', loanTermsController.getOptions);
router.get('/status', loanTermsController.getStatus);

export const loanTermsRoutes = router;
export default router;
