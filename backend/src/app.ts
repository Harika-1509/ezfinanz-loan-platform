import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import healthRoutes from './modules/health/health.routes';
import { authRoutes } from './modules/auth';
import { verificationRoutes } from './modules/verification';
import { requestLogger } from './shared/middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { authLimiter } from './shared/middleware/rate-limit.middleware';
import { sendSuccess } from './shared/utils/api-response';

export const createApp = (): Application => {
  const app = express();

  // Core Security & Utilities
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Custom Request Logger
  app.use(requestLogger());

  // Static File Uploads Endpoint
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Direct Health check endpoint
  app.use('/health', healthRoutes);

  // Root welcome endpoint with API discovery
  app.get('/', (_req, res) => {
    return sendSuccess(
      res,
      {
        name: 'EZFinanz Loan Platform API',
        version: '1.0.0',
        environment: config.NODE_ENV,
        endpoints: {
          health: '/health',
          apiV1: config.API_PREFIX,
          apiV1Health: `${config.API_PREFIX}/health`,
          apiV1Auth: `${config.API_PREFIX}/auth`,
          apiV1Verification: `${config.API_PREFIX}/verification`,
          uploads: '/uploads',
        },
      },
      'Welcome to EZFinanz Loan Platform API'
    );
  });

  // API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.use('/health', healthRoutes);
  apiV1Router.use('/auth', authLimiter, authRoutes);
  apiV1Router.use('/verification', verificationRoutes);

  app.use(config.API_PREFIX, apiV1Router);

  // 404 & Central Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
