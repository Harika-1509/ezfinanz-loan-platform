import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import config from '../../config';
import { AppError } from './app-error';

export interface TokenPayload {
  userId: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
}

/**
 * Sign an Access Token (default expires in config.JWT_EXPIRES_IN e.g. 7d)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Sign a Refresh Token (expires in 30d)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '30d',
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Authentication token has expired. Please log in again.');
    }
    throw AppError.unauthorized('Invalid authentication token.');
  }
}
