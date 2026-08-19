import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../utils/app-error';

// Augment Express User interface so Passport and Express both use TokenPayload
declare global {
  namespace Express {
    interface User extends TokenPayload {
      _extra?: never;
    }
  }
}

/**
 * Authentication Guard Middleware
 * Verifies standard `Authorization: Bearer <jwt>` HTTP header.
 */
export const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Authentication required. Missing or malformed Bearer token in Authorization header.'
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Authentication token is missing.');
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
