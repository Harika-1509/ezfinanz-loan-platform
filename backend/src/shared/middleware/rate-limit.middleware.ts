import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/api-response';
import { config } from '../../config';

/**
 * Rate limiter for OTP generation/dispatch to prevent spamming and SMS exhaustion.
 * Limit: 5 requests per 10 minutes per IP
 */
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  handler: (_req, res) => {
    return sendError(
      res,
      'Too many OTP requests from this IP address. Please wait 10 minutes before requesting another OTP.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

/**
 * Rate limiter for Authentication (Login / Signup) endpoints to mitigate brute-force attacks.
 * Limit: 15 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  handler: (_req, res) => {
    return sendError(
      res,
      'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});
