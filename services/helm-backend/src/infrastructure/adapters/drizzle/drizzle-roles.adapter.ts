import { Inject, Injectable, Optional } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { APP_ENV, type AppEnv } from '../../config/env';
import type { AppRole } from '../../ports/auth.port';
import type { RolesPort } from '../../ports/roles.port';
import { createDrizzleClient, DRIZZLE, type DrizzleClient } from './drizzle.client';
import { userRoles } from './schema';

/**
 * Loads active roles from identity.user_roles (DB source of truth).
 */
@Injectable()
export class DrizzleRolesAdapter implements RolesPort {
  private readonly db: DrizzleClient | null;

  constructor(
    @Inject(APP_ENV) env: AppEnv,
    @Optional() @Inject(DRIZZLE) injected?: DrizzleClient | null,
  ) {
    this.db = injected ?? (env.DATABASE_URL ? createDrizzleClient(env.DATABASE_URL) : null);
  }

  async listActiveRoles(userId: string): Promise<AppRole[]> {
    if (!this.db) {
      throw new Error('DATABASE_URL is required to resolve authorization roles');
    }
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));
    return rows.map((r) => r.role as AppRole);
  }
}
