import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle client factory.
 * DATABASE_URL points at local Supabase/Postgres (see .env.example).
 * SQL migrations in supabase/migrations remain authoritative.
 */
export function createDrizzleClient(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;

export const DRIZZLE = Symbol('DRIZZLE');
