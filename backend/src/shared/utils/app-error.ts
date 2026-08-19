export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, errorCode, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', errorCode: string = 'UNAUTHORIZED', details?: any) {
    super(message, 401, errorCode, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', errorCode: string = 'FORBIDDEN', details?: any) {
    super(message, 403, errorCode, details);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    errorCode: string = 'NOT_FOUND',
    details?: any
  ) {
    super(message, 404, errorCode, details);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Conflict detected',
    errorCode: string = 'CONFLICT',
    details?: any
  ) {
    super(message, 409, errorCode, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: any,
    errorCode: string = 'VALIDATION_ERROR'
  ) {
    super(message, 422, errorCode, details);
  }
}
