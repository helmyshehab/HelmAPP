import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_NAME: z.string().default('Helm حلم'),
  APP_VERSION: z.string().default('0.1.0'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().optional(),

  // Auth — secrets stay server-side. Prefer mock locally; never in production.
  AUTH_PROVIDER: z.enum(['mock', 'supabase_jwt']).default('mock'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
  /** Optional explicit issuer; defaults to `${SUPABASE_URL}/auth/v1` when URL is set. */
  SUPABASE_JWT_ISSUER: z.string().url().optional().or(z.literal('').transform(() => undefined)),

  AI_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  FLIGHT_PROVIDER: z.enum(['mock']).default('mock'),
  NOTIFY_PROVIDER: z.enum(['console', 'mock']).default('console'),

  /**
   * Object storage for catalog covers.
   * `mock` — in-memory (tests / unpaid local MVP).
   * `supabase` — thin Storage REST via service role (never anon).
   */
  STORAGE_PROVIDER: z.enum(['mock', 'supabase']).default('mock'),
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

  // Hard fail: mock auth must never run in production.
  if (env.NODE_ENV === 'production' && env.AUTH_PROVIDER === 'mock') {
    throw new Error(
      'AUTH_PROVIDER=mock is forbidden when NODE_ENV=production; set AUTH_PROVIDER=supabase_jwt',
    );
  }

  if (env.AUTH_PROVIDER === 'mock' && !env.SUPABASE_JWT_SECRET) {
    throw new Error(
      'AUTH_PROVIDER=mock requires SUPABASE_JWT_SECRET (min 32 chars); refusing hardcoded shared secret',
    );
  }

  if (env.AUTH_PROVIDER === 'supabase_jwt' && !env.SUPABASE_JWT_SECRET && !env.SUPABASE_URL) {
    throw new Error(
      'AUTH_PROVIDER=supabase_jwt requires SUPABASE_JWT_SECRET (local) or SUPABASE_URL (JWKS)',
    );
  }

  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when NODE_ENV=production');
  }

  if (env.STORAGE_PROVIDER === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (backend-only)',
      );
    }
  }

  return env;
}

export const APP_ENV = Symbol('APP_ENV');

/** Resolve JWT issuer for Supabase tokens. */
export function resolveJwtIssuer(env: AppEnv): string | undefined {
  if (env.SUPABASE_JWT_ISSUER) return env.SUPABASE_JWT_ISSUER;
  if (env.SUPABASE_URL) {
    return new URL('/auth/v1', env.SUPABASE_URL).toString().replace(/\/$/, '');
  }
  return undefined;
}
