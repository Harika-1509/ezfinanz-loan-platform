import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authGuard } from '../../shared/middleware/auth.middleware';
import { signupSchema, loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), (req, res, next) =>
  authController.signup(req, res, next)
);
router.post('/login', validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) =>
  authController.refreshToken(req, res, next)
);
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Protected routes
router.get('/me', authGuard, (req, res, next) => authController.getMe(req, res, next));

export default router;
