import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { sendError } from '../utils/api-response';
import { config } from '../../config';

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'RESOURCE_NOT_FOUND');
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  // Handle SyntaxError / JSON parse errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return sendError(res, 'Malformed JSON payload in request', 400, 'INVALID_JSON');
  }

  // Log unhandled unexpected errors
  console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);

  const message =
    config.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal error';
  const details = config.NODE_ENV === 'development' ? { stack: err.stack } : undefined;

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
};
