import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Format and sanitize the PostgreSQL connection string for Serverless / PgBouncer environments (e.g. Neon)
 */
function sanitizeDatabaseUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  try {
    const parsed = new URL(url);
    const isPooler =
      parsed.hostname.includes('-pooler') ||
      parsed.hostname.includes('neon.tech') ||
      parsed.hostname.includes('supabase') ||
      parsed.searchParams.has('pgbouncer');

    if (isPooler) {
      // 1. Remove channel_binding which can trigger socket reset errors in pooled SCRAM
      parsed.searchParams.delete('channel_binding');

      // 2. Ensure pgbouncer flag is set so Prisma adapts query preparation
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }

      // 3. Disable statement caching for PgBouncer transaction pooling (critical for avoiding Closed socket errors)
      if (!parsed.searchParams.has('statement_cache_size')) {
        parsed.searchParams.set('statement_cache_size', '0');
      }

      // 4. Ensure SSL is required
      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }

      // 5. Set sensible connection pool limits to avoid stale connections & transaction timeouts
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '25');
      }
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '60');
      }
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '30');
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return raw URL
    return url;
  }
}

const dbUrl = sanitizeDatabaseUrl(config.DATABASE_URL);

/**
 * Create base Prisma client instance
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log:
      config.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : ['error'],
  });

  // Log warnings & errors gracefully without crashing the process
  if (config.NODE_ENV === 'development') {
    (client as any).$on?.('error', (e: any) => {
      // Suppress noisy transient closed connection logs if harmless
      if (e.message?.includes('Closed') || e.message?.includes('kind: Closed')) {
        console.warn('⚠️ [Prisma] Transient pool connection recycle detected. Reconnecting automatically...');
      } else {
        console.error('❌ [Prisma Error]:', e.message || e);
      }
    });

    (client as any).$on?.('warn', (e: any) => {
      console.warn('⚠️ [Prisma Warning]:', e.message || e);
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Explicit connection warmup with retry for serverless database cold starts
 */
export async function connectDatabase(maxRetries = 3, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      // Perform a lightweight query to verify connectivity
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [Prisma] Connected to PostgreSQL successfully.');
      return;
    } catch (err: any) {
      console.warn(
        `⚠️ [Prisma] Connection attempt ${attempt}/${maxRetries} failed: ${err.message || err}`
      );
      if (attempt === maxRetries) {
        console.error('❌ [Prisma] Could not connect to PostgreSQL after maximum retries.');
        // Don't crash process completely so healthcheck endpoint can still respond with degraded state
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

/**
 * Disconnect Prisma Client gracefully
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 [Prisma] Disconnected from PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ [Prisma] Error during disconnect:', err?.message || err);
  }
}

export default prisma;
