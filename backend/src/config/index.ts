import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/ezfinanz?schema=public'),
  JWT_SECRET: z.string().default('ezfinanz_development_jwt_secret_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api/v1'),
});

export type Config = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment configuration:',
    JSON.stringify(parsedEnv.error.format(), null, 2)
  );
  process.exit(1);
}

/**
 * Strongly-typed application configuration.
 * NOTE: Never access `process.env` directly in application logic; always import `config` from this module.
 */
export const config: Config = parsedEnv.data;
export default config;
