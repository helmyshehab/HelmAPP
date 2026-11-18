/**
 * Drizzle schema stub (Step 2).
 * Authoritative SQL migrations live in supabase/migrations/.
 * Domain modules must not import Supabase SDKs — use repos via this layer later.
 */
import { pgSchema, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const identitySchema = pgSchema('identity');

/** Minimal placeholder table mirroring migration stub — expand in later phases. */
export const userAccounts = identitySchema.table('user_accounts', {
  id: uuid('id').primaryKey(),
  authProviderRef: text('auth_provider_ref'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
