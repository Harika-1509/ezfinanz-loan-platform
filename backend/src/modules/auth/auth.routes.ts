import { Router } from 'express';
import passport from 'passport';
import { authController } from './auth.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authGuard } from '../../shared/middleware/auth.middleware';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  mockOAuthSchema,
  sendAuthOtpSchema,
  verifyAuthOtpSchema,
} from './auth.schema';
import config from '../../config';
import { sendError } from '../../shared/utils/api-response';
import { authLimiter } from '../../shared/middleware/rate-limit.middleware';

const router = Router();

// Public Authentication Routes
router.post(
  '/signup',
  authLimiter as any,
  validate(signupSchema),
  (req, res, next) => authController.signup(req, res, next)
);

router.post(
  '/login',
  authLimiter as any,
  validate(loginSchema),
  (req, res, next) => authController.login(req, res, next)
);

// Phone OTP Login Routes
router.post(
  '/otp/send',
  authLimiter as any,
  validate(sendAuthOtpSchema),
  (req, res, next) => authController.sendOtp(req, res, next)
);

router.post(
  '/otp/verify',
  authLimiter as any,
  validate(verifyAuthOtpSchema),
  (req, res, next) => authController.verifyOtp(req, res, next)
);

router.post('/refresh', validate(refreshTokenSchema), (req, res, next) =>
  authController.refreshToken(req, res, next)
);

router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Google OAuth 2.0 Endpoints
router.get('/google', (req, res, next) => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return sendError(
      res,
      'Google OAuth credentials not configured in backend environment. Use POST /api/v1/auth/google/mock for local testing.',
      501,
      'OAUTH_NOT_CONFIGURED'
    );
  }
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=OAUTH_NOT_CONFIGURED`);
    }
    return passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.FRONTEND_URL}/login?error=OAUTH_FAILED`,
    })(req, res, next);
  },
  (req, res, next) => authController.googleCallback(req, res, next)
);

// Mocked OAuth Exchange Endpoint for automated integration tests & local testing
router.post('/google/mock', validate(mockOAuthSchema), (req, res, next) =>
  authController.googleMock(req, res, next)
);

// Protected Authentication Profile & Customer Loan Application Summary
router.get('/me', authGuard, (req, res, next) => authController.getMe(req, res, next));
router.get('/my-application', authGuard, (req, res, next) =>
  authController.getMyApplication(req, res, next)
);

// Dev / Test OTP extraction endpoint (strictly non-production)
router.get('/dev/latest-otp', (req, res, next) =>
  authController.getDevLatestOtp(req, res, next)
);

export default router;
