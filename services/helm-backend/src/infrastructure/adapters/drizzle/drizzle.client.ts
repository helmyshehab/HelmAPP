import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.stub';

/**
 * Drizzle client factory stub.
 * DATABASE_URL points at local Supabase/Postgres (see .env.example).
 */
export function createDrizzleClient(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
