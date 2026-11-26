import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleClient,
} from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { AppException } from '../../../common/errors/app.exception';

export type BootstrapResult = {
  userId: string;
  email: string | null;
  accountStatus: string;
  displayName: string | null;
  preferredLocale: string;
  preferredCurrency: string;
  accountCreated: boolean;
  profileCreated: boolean;
};

type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/**
 * Identity writes for customer onboarding.
 * Account id is always the verified JWT subject — never resolved by email.
 */
@Injectable()
export class IdentityRepository {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) {
      throw AppException.validation(
        'Identity database is not configured (DATABASE_URL)',
      );
    }
    return this.db;
  }

  async bootstrapCustomerProfile(input: {
    userId: string;
    email?: string;
  }): Promise<BootstrapResult> {
    const db = this.requireDb();
    const userId = input.userId;
    const email = normalizeEmail(input.email);

    return db.transaction(async (tx) => {
      const accountCreated = await this.ensureAccount(tx, userId, email);
      const profileCreated = await this.ensureProfile(tx, userId);
      const row = await this.loadBootstrapRow(tx, userId);
      if (!row) {
        throw new Error('Bootstrap failed to load account/profile after ensure');
      }
      return { ...row, accountCreated, profileCreated };
    });
  }

  /**
   * Insert account by JWT subject. Never look up or link by email.
   * If the JWT email is owned by another account (or races to unique conflict),
   * ensure this subject with null primary_email. Existing rows stay untouched.
   */
  private async ensureAccount(
    tx: Tx,
    userId: string,
    email: string | null,
  ): Promise<boolean> {
    if (email !== null && (await this.insertAccount(tx, userId, email))) {
      return true;
    }
    return this.insertAccount(tx, userId, null);
  }

  private async insertAccount(
    tx: Tx,
    userId: string,
    email: string | null,
  ): Promise<boolean> {
    // An email-bearing insert can race on either the subject or the email
    // index. The fallback omits the email and only ignores an existing subject.
    const conflictTarget = email === null ? sql`(id)` : sql``;
    const rows = await tx.execute(sql`
      insert into identity.user_accounts (id, auth_provider_ref, primary_email, status)
      values (
        ${userId}::uuid,
        ${userId},
        ${email},
        'active'
      )
      on conflict ${conflictTarget} do nothing
      returning id
    `);
    return rowCount(rows) > 0;
  }

  private async ensureProfile(tx: Tx, userId: string): Promise<boolean> {
    const rows = await tx.execute(sql`
      insert into identity.customer_profiles (
        user_id,
        preferred_locale,
        preferred_currency,
        preferences_json
      )
      values (
        ${userId}::uuid,
        'ar',
        'EGP',
        '{}'::jsonb
      )
      on conflict (user_id) do nothing
      returning user_id
    `);
    return rowCount(rows) > 0;
  }

  private async loadBootstrapRow(
    tx: Tx,
    userId: string,
  ): Promise<{
    userId: string;
    email: string | null;
    accountStatus: string;
    displayName: string | null;
    preferredLocale: string;
    preferredCurrency: string;
  } | null> {
    const rows = await tx.execute(sql`
      select
        a.id::text as "userId",
        a.primary_email::text as email,
        a.status as "accountStatus",
        p.display_name as "displayName",
        coalesce(p.preferred_locale, 'ar') as "preferredLocale",
        coalesce(p.preferred_currency, 'EGP') as "preferredCurrency"
      from identity.user_accounts a
      join identity.customer_profiles p on p.user_id = a.id
      where a.id = ${userId}::uuid
      limit 1
    `);
    const list = asRowArray(rows);
    if (list.length === 0) return null;
    const r = list[0] as Record<string, unknown>;
    return {
      userId: String(r.userId),
      email: r.email == null || r.email === '' ? null : String(r.email),
      accountStatus: String(r.accountStatus),
      displayName: r.displayName == null ? null : String(r.displayName),
      preferredLocale: String(r.preferredLocale),
      preferredCurrency: String(r.preferredCurrency),
    };
  }
}

function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function rowCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === 'object' && 'rowCount' in result) {
    const n = (result as { rowCount?: number }).rowCount;
    if (typeof n === 'number') return n;
  }
  if (result && typeof result === 'object' && 'length' in result) {
    const n = (result as { length?: number }).length;
    if (typeof n === 'number') return n;
  }
  return asRowArray(result).length;
}

function asRowArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown[] }).rows)) {
    return (result as { rows: unknown[] }).rows;
  }
  return [];
}
