import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Sends a standardized success API response
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Operation successful',
  statusCode: number = 200,
  meta?: Record<string, any>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    meta: {
      timestamp: new Date().toISOString(),
      ...(meta || {}),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Sends a standardized error API response
 */
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_ERROR',
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};
