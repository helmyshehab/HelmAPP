import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleClient } from '../../infrastructure/adapters/drizzle/drizzle.client';

export type AuditWrite = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
};

/**
 * Writes ops.audit_events. Never logs passwords, JWTs, or secrets.
 */
@Injectable()
export class AuditService {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  async record(event: AuditWrite): Promise<void> {
    if (!this.db) return;
    const after = event.after ? { ...event.after } : null;
    const before = event.before ? { ...event.before } : null;
    scrubSecrets(after);
    scrubSecrets(before);
    if (event.reason && after) {
      after.reason = event.reason;
    } else if (event.reason) {
      // attach reason without inventing entity payload
    }
    await this.db.execute(sql`
      insert into ops.audit_events (actor_user_id, action, entity_type, entity_id, before_json, after_json)
      values (
        ${event.actorUserId ?? null}::uuid,
        ${event.action},
        ${event.entityType},
        ${event.entityId ?? null}::uuid,
        ${before ? JSON.stringify(before) : null}::jsonb,
        ${after ? JSON.stringify(after) : event.reason ? JSON.stringify({ reason: event.reason }) : null}::jsonb
      )
    `);
  }
}

function scrubSecrets(obj: Record<string, unknown> | null): void {
  if (!obj) return;
  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('jwt') ||
      lower.includes('authorization')
    ) {
      delete obj[key];
    }
  }
}
