import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { config } from '../../config';

// Define custom morgan token for response time in ms with formatting
export const requestLogger = () => {
  if (config.NODE_ENV === 'test') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return morgan(':method :url :status :res[content-length] - :response-time ms');
};
