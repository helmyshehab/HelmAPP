import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().optional(),
  AI_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  FLIGHT_PROVIDER: z.enum(['mock']).default('mock'),
  NOTIFY_PROVIDER: z.enum(['console', 'mock']).default('console'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
