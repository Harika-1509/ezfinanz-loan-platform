import { Request, Response, NextFunction } from 'express';
import { authService, AuthResult } from './auth.service';
import { sendSuccess } from '../../shared/utils/api-response';
import config from '../../config';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   */
  public async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signup(req.body);

      // Set httpOnly refresh token cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          user: result.user,
          application: result.application,
          accessToken: result.accessToken,
        },
        'Account created successfully. Loan application initiated.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);

      // Set httpOnly refresh token cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          user: result.user,
          application: result.application,
          accessToken: result.accessToken,
        },
        'Login successful.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/google/callback
   * Live Passport.js callback handler
   */
  public async googleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const authResult = (req as any).user as AuthResult;

    if (!authResult || !authResult.accessToken) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=OAUTH_FAILED`);
    }

    // Set httpOnly refresh token cookie
    res.cookie('refreshToken', authResult.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Redirect to frontend callback route with accessToken
    return res.redirect(
      `${config.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(authResult.accessToken)}`
    );
  }

  /**
   * POST /api/v1/auth/google/mock
   * Mocked OAuth provider route for testing & local development
   */
  public async googleMock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { googleId, email, name } = req.body;
      const result = await authService.handleOAuthLogin({
        googleId,
        email,
        name,
      });

      // Set httpOnly refresh token cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          user: result.user,
          application: result.application,
          accessToken: result.accessToken,
        },
        'Google OAuth login successful.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshToken(token);

      // Set rotated refresh token cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          user: result.user,
        },
        'Token refreshed successfully.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      await authService.logout(token);

      // Clear cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        path: '/',
      });

      sendSuccess(res, null, 'Logged out successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getMe(req.user!.userId);
      sendSuccess(res, result, 'User profile retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/my-application
   */
  public async getMyApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getMyApplicationDetails(req.user!.userId);
      sendSuccess(res, result, 'Customer loan application details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
