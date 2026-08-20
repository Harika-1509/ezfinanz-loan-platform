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

  // Static Factory Helpers
  static badRequest(
    message: string = 'Bad request',
    details?: any,
    errorCode: string = 'BAD_REQUEST'
  ): BadRequestError {
    return new BadRequestError(message, errorCode, details);
  }

  static unauthorized(
    message: string = 'Unauthorized',
    details?: any,
    errorCode: string = 'UNAUTHORIZED'
  ): UnauthorizedError {
    return new UnauthorizedError(message, errorCode, details);
  }

  static forbidden(
    message: string = 'Forbidden',
    details?: any,
    errorCode: string = 'FORBIDDEN'
  ): ForbiddenError {
    return new ForbiddenError(message, errorCode, details);
  }

  static notFound(
    message: string = 'Resource not found',
    details?: any,
    errorCode: string = 'NOT_FOUND'
  ): NotFoundError {
    return new NotFoundError(message, errorCode, details);
  }

  static conflict(
    message: string = 'Conflict detected',
    details?: any,
    errorCode: string = 'CONFLICT'
  ): ConflictError {
    return new ConflictError(message, errorCode, details);
  }

  static validation(
    message: string = 'Validation failed',
    details?: any,
    errorCode: string = 'VALIDATION_ERROR'
  ): ValidationError {
    return new ValidationError(message, details, errorCode);
  }

  static tooManyRequests(
    message: string = 'Too many requests',
    details?: any,
    errorCode: string = 'RATE_LIMIT_EXCEEDED'
  ): TooManyRequestsError {
    return new TooManyRequestsError(message, errorCode, details);
  }

  static internal(
    message: string = 'Internal server error',
    details?: any,
    errorCode: string = 'INTERNAL_SERVER_ERROR'
  ): InternalServerError {
    return new InternalServerError(message, errorCode, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string = 'Too many requests',
    errorCode: string = 'RATE_LIMIT_EXCEEDED',
    details?: any
  ) {
    super(message, 429, errorCode, details);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message, 500, errorCode, details);
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
