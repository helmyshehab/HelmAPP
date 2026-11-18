import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception';
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

export type AuditListItem = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Writes and reads ops.audit_events. Never logs passwords, JWTs, or secrets.
 * List/read is administrator+ only at the API layer.
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

  async listByEntity(input: {
    entityType: string;
    entityId: string;
    limit: number;
    offset: number;
  }): Promise<{ items: AuditListItem[]; total: number; limit: number; offset: number }> {
    if (!this.db) {
      throw AppException.validation('Audit database is not configured (DATABASE_URL)');
    }
    const limit = Math.min(Math.max(input.limit, 1), 100);
    const offset = Math.max(input.offset, 0);
    const rows = await this.db.execute(sql`
      select
        id,
        actor_user_id as "actorUserId",
        action,
        entity_type as "entityType",
        entity_id as "entityId",
        before_json as before,
        after_json as after,
        created_at as "createdAt"
      from ops.audit_events
      where entity_type = ${input.entityType}
        and entity_id = ${input.entityId}::uuid
      order by created_at desc, id desc
      limit ${limit} offset ${offset}
    `);
    const countRes = await this.db.execute(sql`
      select count(*)::int as c
      from ops.audit_events
      where entity_type = ${input.entityType}
        and entity_id = ${input.entityId}::uuid
    `);
    const total = Number((countRes as unknown as { c: number }[])[0]?.c ?? 0);
    const items = (rows as unknown as AuditListItem[]).map((row) => {
      const before =
        row.before && typeof row.before === 'object'
          ? ({ ...(row.before as Record<string, unknown>) } as Record<string, unknown>)
          : null;
      const after =
        row.after && typeof row.after === 'object'
          ? ({ ...(row.after as Record<string, unknown>) } as Record<string, unknown>)
          : null;
      scrubSecrets(before);
      scrubSecrets(after);
      return {
        id: String(row.id),
        actorUserId: row.actorUserId ? String(row.actorUserId) : null,
        action: String(row.action),
        entityType: String(row.entityType),
        entityId: row.entityId ? String(row.entityId) : null,
        before,
        after,
        createdAt: String(row.createdAt),
      };
    });
    return { items, total, limit, offset };
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
