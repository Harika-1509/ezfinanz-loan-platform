import { Router } from 'express';
import { verificationController } from './verification.controller';
import {
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from './verification.schema';
import { authGuard, validate, otpSendLimiter } from '../../shared/middleware';

const router = Router();

// All verification routes require authentication
router.use(authGuard);

router.post(
  '/email/send',
  otpSendLimiter as any,
  validate(sendEmailOtpSchema),
  verificationController.sendEmailOtp
);

router.post(
  '/email/verify',
  validate(verifyEmailOtpSchema),
  verificationController.verifyEmailOtp
);

router.post(
  '/phone/send',
  otpSendLimiter as any,
  validate(sendPhoneOtpSchema),
  verificationController.sendPhoneOtp
);

router.post(
  '/phone/verify',
  validate(verifyPhoneOtpSchema),
  verificationController.verifyPhoneOtp
);

router.get('/status', verificationController.getStatus);

export const verificationRoutes = router;
