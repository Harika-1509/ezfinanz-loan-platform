import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error';
import { sendError } from '../utils/api-response';
import { config } from '../../config';

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'RESOURCE_NOT_FOUND');
};

export const errorHandler = (
  err: Error | AppError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Operational AppError instances
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  // Prisma Unique Constraint Violation (P2002)
  if ('code' in err && err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || [];
    const field = target.length > 0 ? target.join(', ') : 'field';
    return sendError(
      res,
      `A record with this ${field} already exists in the system.`,
      409,
      'CONFLICT'
    );
  }

  // Prisma Record Not Found (P2025)
  if ('code' in err && err.code === 'P2025') {
    return sendError(res, 'The requested record could not be found.', 404, 'NOT_FOUND');
  }

  // Handle SyntaxError / JSON parse errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return sendError(res, 'Malformed JSON payload in request', 400, 'INVALID_JSON');
  }

  // Log unhandled unexpected errors
  console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);

  const message =
    config.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal error';
  const details = config.NODE_ENV === 'development' ? { stack: err.stack } : undefined;

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
};
