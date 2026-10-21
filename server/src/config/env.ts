import { z } from 'zod';

const optionalString = z.string().trim().min(1).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.url().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  STORE_NAME: z.string().default("Timeless Luxury Two O'Clock"),
  STORE_SUPPORT_EMAIL: z.string().default('support@example.com'),
  STORE_WHATSAPP_NUMBER: z.string().regex(/^\d*$/, 'Digits only, international format').default(''),

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().default("Two O'Clock <no-reply@example.com>"),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_CURRENCY: z.string().length(3).default('usd'),
  STRIPE_MWK_RATE: z.coerce.number().positive().default(1750),
  AIRTEL_MONEY_BASE_URL: optionalString,
  AIRTEL_MONEY_API_KEY: optionalString,
  AIRTEL_MONEY_WEBHOOK_SECRET: optionalString,
  MPAMBA_BASE_URL: optionalString,
  MPAMBA_API_KEY: optionalString,
  MPAMBA_WEBHOOK_SECRET: optionalString,

  BOOTSTRAP_ADMIN_EMAIL: optionalString,
  BOOTSTRAP_ADMIN_PASSWORD: optionalString,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
