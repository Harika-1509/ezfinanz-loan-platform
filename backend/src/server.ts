/**
 * EZFinanz Loan Platform - Backend Entry Point
 *
 * Resilient Server Lifecycle & Process Management for Seamless Development & Production
 */

import { Server } from 'http';
import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './prisma/client';

let server: Server | null = null;
let isShuttingDown = false;

/**
 * Start Express HTTP server with port-retry resilience (prevents EADDRINUSE crashes during hot reload)
 */
async function startServerWithRetry(
  port: number,
  maxRetries = 5,
  delayMs = 400
): Promise<Server> {
  const app = createApp();

  return new Promise((resolve, reject) => {
    let currentAttempt = 0;

    function tryListen() {
      currentAttempt++;
      const srv = app.listen(port);

      srv.once('listening', () => {
        console.log(`
  ======================================================
  🚀 EZFinanz Backend API running on port ${port}
  📡 Environment: ${config.NODE_ENV}
  🏥 Root Health Check:   http://localhost:${port}/health
  🏥 API v1 Health Check: http://localhost:${port}${config.API_PREFIX}/health
  ======================================================
        `);
        resolve(srv);
      });

      srv.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && currentAttempt < maxRetries) {
          console.warn(
            `⚠️ [Server] Port ${port} in use (attempt ${currentAttempt}/${maxRetries}). Waiting ${delayMs}ms for previous instance to release socket...`
          );
          setTimeout(() => {
            tryListen();
          }, delayMs);
        } else {
          console.error(`❌ [Server] Failed to bind to port ${port}:`, err.message || err);
          reject(err);
        }
      });
    }

    tryListen();
  });
}

/**
 * Graceful shutdown handler for signals (SIGTERM, SIGINT, SIGUSR2)
 */
async function gracefulShutdown(signal: string, callback?: () => void): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n⏳ [Process] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('🔌 [Server] HTTP server closed.');
      await disconnectDatabase();
      console.log('✅ [Process] Clean shutdown complete.');
      if (callback) {
        callback();
      } else {
        process.exit(0);
      }
    });
  } else {
    await disconnectDatabase();
    if (callback) {
      callback();
    } else {
      process.exit(0);
    }
  }
}

async function bootstrap(): Promise<void> {
  // 1. Warmup PostgreSQL connection
  await connectDatabase();

  // 2. Start HTTP server with EADDRINUSE retry protection
  server = await startServerWithRetry(config.PORT);

  // 3. Nodemon restart handler (SIGUSR2)
  process.once('SIGUSR2', async () => {
    await gracefulShutdown('SIGUSR2', () => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });

  // 4. Standard termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 5. Catch unhandled errors gracefully without abrupt process termination
  process.on('unhandledRejection', (reason: any) => {
    console.error('⚠️ [Process] Unhandled Promise Rejection:', reason?.message || reason);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('❌ [Process] Uncaught Exception:', error?.message || error);
    // Don't crash immediately in development on transient errors
    if (config.NODE_ENV === 'production') {
      gracefulShutdown('uncaughtException');
    }
  });
}

bootstrap().catch((err) => {
  console.error('❌ [Server] Fatal startup error:', err);
  process.exit(1);
});
