import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { sendError } from '../utils/api-response';
import { config } from '../../config';

/**
 * Determines whether rate limiting should be bypassed (development, test environments, or local loopback)
 */
export const isDevOrTest = (req: Request): boolean => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocalIp =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    req.hostname === 'localhost';

  return (
    config.NODE_ENV !== 'production' ||
    process.env.NODE_ENV !== 'production' ||
    process.env.VITEST === 'true' ||
    isLocalIp
  );
};

/**
 * Rate limiter for OTP generation/dispatch to prevent spamming and SMS exhaustion.
 * Limit: 10 requests per 10 minutes per IP (bypassed in local/dev)
 */
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: config.NODE_ENV === 'production' ? 10 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevOrTest(req as Request),
  handler: (_req, res) => {
    sendError(
      res as any,
      'Too many OTP requests from this IP address. Please wait 10 minutes before requesting another OTP.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for Authentication (Login / Signup / OTP) endpoints to mitigate brute-force attacks.
 * Limit: 60 requests per 15 minutes per IP (bypassed in local/dev)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 60 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevOrTest(req as Request),
  handler: (_req, res) => {
    sendError(
      res as any,
      'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});
