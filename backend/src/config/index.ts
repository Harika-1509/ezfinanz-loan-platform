import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Preserve test environment when running vitest
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default(isTestEnv ? 'test' : 'development'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/ezfinanz?schema=public'),
  JWT_SECRET: z.string().default('ezfinanz_development_jwt_secret_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/auth/google/callback'),
  UPLOAD_DIR: z.string().default('uploads'),

  // Twilio SMS & Verify Configuration
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_VERIFY_SERVICE_SID: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),

  // Email Delivery Configuration (Resend or SMTP: SendGrid, AWS SES, Brevo, Gmail, Custom SMTP)
  EMAIL_PROVIDER: z.enum(['auto', 'resend', 'smtp', 'mock']).default('auto'),
  RESEND_API_KEY: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((val) => val === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('EZFinanz Personal Loans <support@ezfinanz.com>'),

  // OTP Security Controls
  OTP_EXPIRY_MINUTES: z.string().default('10').transform(Number),
  OTP_MAX_ATTEMPTS: z.string().default('10').transform(Number),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().default('10').transform(Number),
  OTP_LOCKOUT_MINUTES: z.string().default('10').transform(Number),
  OTP_HMAC_SECRET: z.string().default('ezfinanz_otp_hmac_secret_salt_2026'),
});

export type Config = z.infer<typeof envSchema>;

const rawEnv = {
  ...process.env,
  NODE_ENV: isTestEnv ? 'test' : (process.env.NODE_ENV || 'development'),
};

const parsedEnv = envSchema.safeParse(rawEnv);

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
