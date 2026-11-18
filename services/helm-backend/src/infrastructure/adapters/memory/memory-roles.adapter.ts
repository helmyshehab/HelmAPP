import { Injectable } from '@nestjs/common';
import type { AppRole } from '../../ports/auth.port';
import type { RolesPort } from '../../ports/roles.port';

/**
 * In-memory RolesPort for unit tests without Postgres.
 * Not used when DATABASE_URL is configured.
 */
@Injectable()
export class MemoryRolesAdapter implements RolesPort {
  private readonly store = new Map<string, AppRole[]>();

  seed(userId: string, roles: AppRole[]) {
    this.store.set(userId, [...roles]);
  }

  async listActiveRoles(userId: string): Promise<AppRole[]> {
    return this.store.get(userId) ?? [];
  }
}
