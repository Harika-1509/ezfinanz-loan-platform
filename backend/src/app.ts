import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport, { configurePassport } from './config/passport';
import { config } from './config';
import healthRoutes from './modules/health/health.routes';
import { authRoutes } from './modules/auth';
import { verificationRoutes } from './modules/verification';
import { kycRoutes } from './modules/kyc';
import { eligibilityRoutes } from './modules/eligibility';
import { loanTermsRoutes } from './modules/loan-terms';
import { bankAccountRoutes } from './modules/bank-account';
import { declarationRoutes } from './modules/declaration';
import { selfieRoutes } from './modules/selfie';
import { adminRoutes } from './modules/admin';
import { requestLogger } from './shared/middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { authLimiter } from './shared/middleware/rate-limit.middleware';
import { sendSuccess } from './shared/utils/api-response';

export const createApp = (): Application => {
  const app = express();

  // Initialize Passport configuration
  configurePassport();

  // Core Security & Utilities
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }) as any
  );
  // Strict CORS: Allow only intended frontend origin(s), never a wildcard
  const allowedOrigins = [
    config.CORS_ORIGIN,
    config.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, automated test suites)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS security policy.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Set-Cookie'],
    }) as any
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser() as any);
  app.use(passport.initialize() as any);

  // Request Logging
  app.use(requestLogger());

  // Static uploads directory (supports both root workspace uploads and local backend uploads)
  const rootUploadsDir = path.resolve(__dirname, '../../uploads');
  const backendUploadsDir = path.resolve(process.cwd(), config.UPLOAD_DIR);
  app.use('/uploads', express.static(rootUploadsDir));
  app.use('/uploads', express.static(backendUploadsDir));

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
          apiV1Kyc: `${config.API_PREFIX}/kyc`,
          apiV1Eligibility: `${config.API_PREFIX}/eligibility`,
          apiV1LoanTerms: `${config.API_PREFIX}/loan-terms`,
          apiV1BankAccount: `${config.API_PREFIX}/bank-account`,
          apiV1Declaration: `${config.API_PREFIX}/declaration`,
          apiV1Selfie: `${config.API_PREFIX}/selfie`,
          apiV1Admin: `${config.API_PREFIX}/admin`,
          uploads: '/uploads',
        },
      },
      'Welcome to EZFinanz Loan Platform API'
    );
  });

  // API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.use('/health', healthRoutes);
  apiV1Router.use('/auth', authRoutes);
  apiV1Router.use('/verification', verificationRoutes);
  apiV1Router.use('/kyc', kycRoutes);
  apiV1Router.use('/eligibility', eligibilityRoutes);
  apiV1Router.use('/loan-terms', loanTermsRoutes);
  apiV1Router.use('/bank-account', bankAccountRoutes);
  apiV1Router.use('/declaration', declarationRoutes);
  apiV1Router.use('/selfie', selfieRoutes);
  apiV1Router.use('/admin', adminRoutes);

  app.use(config.API_PREFIX, apiV1Router);

  // 404 & Central Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
