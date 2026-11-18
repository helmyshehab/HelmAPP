import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_NAME: z.string().default('Helm حلم'),
  APP_VERSION: z.string().default('0.1.0'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().optional(),

  // Auth — secrets stay server-side. Prefer mock locally.
  AUTH_PROVIDER: z.enum(['mock', 'supabase_jwt']).default('mock'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),

  AI_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  FLIGHT_PROVIDER: z.enum(['mock']).default('mock'),
  NOTIFY_PROVIDER: z.enum(['console', 'mock']).default('console'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${detail}`);
  }
  const env = parsed.data;
  if (env.AUTH_PROVIDER === 'supabase_jwt' && !env.SUPABASE_JWT_SECRET && !env.SUPABASE_URL) {
    throw new Error(
      'AUTH_PROVIDER=supabase_jwt requires SUPABASE_JWT_SECRET (local) or SUPABASE_URL (JWKS)',
    );
  }
  return env;
}

export const APP_ENV = Symbol('APP_ENV');
