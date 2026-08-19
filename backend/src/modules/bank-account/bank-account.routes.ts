import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { bankAccountController } from './bank-account.controller';
import { bankAccountSchema } from './bank-account.schema';
import { authGuard, stageGuard, validate } from '../../shared/middleware';

const router = Router();

// All Bank Account routes require authentication
router.use(authGuard);

router.post(
  '/submit',
  stageGuard(ApplicationStage.EMI_SELECTED, ApplicationStage.BANK_ADDED),
  validate(bankAccountSchema),
  bankAccountController.submitBankAccount
);

router.get('/status', bankAccountController.getStatus);

export const bankAccountRoutes = router;
export default router;
