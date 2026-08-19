/**
 * EZFinanz Loan Platform - Backend Entry Point
 *
 * ARCHITECTURAL CHOICE JUSTIFICATION:
 * We selected Express.js with TypeScript and Prisma over NestJS for this solution because:
 * 1. Express provides a lightweight, explicit, and unopinionated layered architecture
 *    (controllers -> services -> routes -> middleware) with zero reflection/decorator runtime overhead.
 * 2. Seamless integration with Prisma ORM and Zod schemas provides end-to-end type safety
 *    without requiring heavy NestJS dependency injection abstractions or complex module metadata.
 * 3. Fast compilation, minimal cold-start times, and clear transparent error handling perfectly
 *    suit loan workflow services, financial calculations, and KYC verification pipelines.
 */

import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`
  ======================================================
  🚀 EZFinanz Backend API running on port ${config.PORT}
  📡 Environment: ${config.NODE_ENV}
  🏥 Root Health Check:   http://localhost:${config.PORT}/health
  🏥 API v1 Health Check: http://localhost:${config.PORT}${config.API_PREFIX}/health
  ======================================================
  `);
});

const handleShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
