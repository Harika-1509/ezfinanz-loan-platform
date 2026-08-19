import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const createApp = (): Application => {
  const app = express();

  // Core Security & Utilities
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Root welcome / health check
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'EZFinanz Loan Platform API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        health: '/api/v1/health',
      },
    });
  });

  // API Routes
  app.use('/api/v1', routes);

  // 404 & Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
