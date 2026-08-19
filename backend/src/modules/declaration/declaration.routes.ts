import { Router } from 'express';
import { ApplicationStage } from '@prisma/client';
import { declarationController } from './declaration.controller';
import { declarationAcceptSchema } from './declaration.schema';
import { authGuard, stageGuard, validate } from '../../shared/middleware';

const router = Router();

// All Declaration routes require authentication
router.use(authGuard);

router.get('/text', declarationController.getDeclarationText);

router.post(
  '/accept',
  stageGuard(
    ApplicationStage.BANK_ADDED,
    ApplicationStage.DECLARATION_CONFIRMED
  ),
  validate(declarationAcceptSchema),
  declarationController.acceptDeclaration
);

router.get('/status', declarationController.getStatus);

export const declarationRoutes = router;
export default router;
