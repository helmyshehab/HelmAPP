import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleClient,
} from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { AppException } from '../../../common/errors/app.exception';

export type TripDraftRow = {
  id: string;
  destinationId: string | null;
  title: string | null;
  constraints: Record<string, unknown>;
  status: 'draft';
  createdAt: string;
  updatedAt: string;
};

export type CreateTripDraftInput = {
  userId: string;
  destinationId?: string | null;
  title?: string | null;
  constraints?: Record<string, unknown>;
};

export type UpdateTripDraftInput = {
  userId: string;
  id: string;
  destinationId?: string | null;
  title?: string | null;
  constraints?: Record<string, unknown>;
  patchDestinationId: boolean;
  patchTitle: boolean;
  patchConstraints: boolean;
};

export type TripDraftItineraryItem = {
  id: string;
  position: number;
  title: string | null;
  notes: string | null;
};

export type TripDraftItineraryDay = {
  id: string;
  position: number;
  label: string | null;
  items: TripDraftItineraryItem[];
};

export type TripDraftItinerary = {
  days: TripDraftItineraryDay[];
};

/**
 * Owner-scoped trip draft persistence.
 * Nest uses the table owner role (bypasses RLS), so every query filters by JWT subject.
 */
@Injectable()
export class TripDraftsRepository {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) {
      throw AppException.validation(
        'Trip drafts database is not configured (DATABASE_URL)',
      );
    }
    return this.db;
  }

  async create(input: CreateTripDraftInput): Promise<TripDraftRow> {
    const db = this.requireDb();
    const destinationId =
      input.destinationId === undefined ? null : input.destinationId;
    const title = input.title === undefined ? null : input.title;
    const constraints = input.constraints ?? {};
    const constraintsJson = JSON.stringify(constraints);

    const destinationSql =
      destinationId === null ? sql`null` : sql`${destinationId}::uuid`;
    const titleSql = title === null ? sql`null` : sql`${title}`;

    try {
      const rows = await db.execute(sql`
        insert into trips.trip_drafts (
          user_id,
          destination_id,
          title,
          constraints_json,
          status
        )
        values (
          ${input.userId}::uuid,
          ${destinationSql},
          ${titleSql},
          ${constraintsJson}::jsonb,
          'draft'::trips.trip_draft_status
        )
        returning
          id::text as "id",
          destination_id::text as "destinationId",
          title as "title",
          constraints_json as "constraints",
          status::text as "status",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);
      const row = mapRow(asRowArray(rows)[0]);
      if (!row) {
        throw new Error('Trip draft insert returned no row');
      }
      return row;
    } catch (err) {
      if (err instanceof AppException) throw err;
      if (isForeignKeyViolation(err)) {
        throw AppException.validation(
          'Invalid destination or missing customer account for trip draft',
        );
      }
      throw err instanceof Error ? err : new Error(collectErrorText(err));
    }
  }

  async listForOwner(userId: string): Promise<TripDraftRow[]> {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        id::text as "id",
        destination_id::text as "destinationId",
        title as "title",
        constraints_json as "constraints",
        status::text as "status",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from trips.trip_drafts
      where user_id = ${userId}::uuid
      order by updated_at desc, created_at desc
    `);
    return asRowArray(rows)
      .map((r) => mapRow(r))
      .filter((r): r is TripDraftRow => r !== null);
  }

  async getForOwner(userId: string, id: string): Promise<TripDraftRow | null> {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        id::text as "id",
        destination_id::text as "destinationId",
        title as "title",
        constraints_json as "constraints",
        status::text as "status",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from trips.trip_drafts
      where id = ${id}::uuid
        and user_id = ${userId}::uuid
      limit 1
    `);
    return mapRow(asRowArray(rows)[0]);
  }

  /**
   * Owner-scoped itinerary read. Returns null when the draft is missing or
   * not owned. An owned draft with no days returns `{ days: [] }`.
   * Uses a fixed query count (ownership + one days/items join).
   */
  async getItineraryForOwner(
    userId: string,
    draftId: string,
  ): Promise<TripDraftItinerary | null> {
    const owned = await this.getForOwner(userId, draftId);
    if (!owned) return null;

    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        d.id::text as "dayId",
        d.position as "dayPosition",
        d.label as "dayLabel",
        i.id::text as "itemId",
        i.position as "itemPosition",
        i.title as "itemTitle",
        i.notes as "itemNotes"
      from trips.itinerary_days d
      left join trips.itinerary_items i on i.day_id = d.id
      where d.draft_id = ${draftId}::uuid
      order by d.position asc, i.position asc nulls last
    `);

    return { days: assembleItineraryDays(asRowArray(rows)) };
  }

  async updateForOwner(input: UpdateTripDraftInput): Promise<TripDraftRow | null> {
    const db = this.requireDb();
    if (!input.patchDestinationId && !input.patchTitle && !input.patchConstraints) {
      return this.getForOwner(input.userId, input.id);
    }

    const sets: ReturnType<typeof sql>[] = [];
    if (input.patchDestinationId) {
      const destinationSql =
        input.destinationId == null
          ? sql`null`
          : sql`${input.destinationId}::uuid`;
      sets.push(sql`destination_id = ${destinationSql}`);
    }
    if (input.patchTitle) {
      const titleSql = input.title == null ? sql`null` : sql`${input.title}`;
      sets.push(sql`title = ${titleSql}`);
    }
    if (input.patchConstraints) {
      const constraintsJson = JSON.stringify(input.constraints ?? {});
      sets.push(sql`constraints_json = ${constraintsJson}::jsonb`);
    }

    try {
      const rows = await db.execute(sql`
        update trips.trip_drafts
        set ${sql.join(sets, sql`, `)}
        where id = ${input.id}::uuid
          and user_id = ${input.userId}::uuid
        returning
          id::text as "id",
          destination_id::text as "destinationId",
          title as "title",
          constraints_json as "constraints",
          status::text as "status",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);
      return mapRow(asRowArray(rows)[0]);
    } catch (err) {
      if (err instanceof AppException) throw err;
      if (isForeignKeyViolation(err)) {
        throw AppException.validation('Invalid destination for trip draft');
      }
      throw err instanceof Error ? err : new Error(collectErrorText(err));
    }
  }
}

function mapRow(raw: unknown): TripDraftRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  return {
    id: r.id,
    destinationId:
      r.destinationId == null || r.destinationId === ''
        ? null
        : String(r.destinationId),
    title: r.title == null ? null : String(r.title),
    constraints: normalizeConstraints(r.constraints),
    status: 'draft',
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  };
}

function assembleItineraryDays(rawRows: unknown[]): TripDraftItineraryDay[] {
  const days: TripDraftItineraryDay[] = [];
  const indexByDayId = new Map<string, number>();

  for (const raw of rawRows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const dayId = typeof r.dayId === 'string' ? r.dayId : '';
    if (!dayId) continue;

    let dayIndex = indexByDayId.get(dayId);
    if (dayIndex === undefined) {
      dayIndex = days.length;
      indexByDayId.set(dayId, dayIndex);
      days.push({
        id: dayId,
        position: toPositiveInt(r.dayPosition),
        label: r.dayLabel == null ? null : String(r.dayLabel),
        items: [],
      });
    }

    const itemId =
      r.itemId == null || r.itemId === '' ? null : String(r.itemId);
    if (!itemId) continue;

    days[dayIndex]!.items.push({
      id: itemId,
      position: toPositiveInt(r.itemPosition),
      title: r.itemTitle == null ? null : String(r.itemTitle),
      notes: r.itemNotes == null ? null : String(r.itemNotes),
    });
  }

  return days;
}

function toPositiveInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

function normalizeConstraints(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value ?? '');
}

function asRowArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown[] }).rows)) {
    return (result as { rows: unknown[] }).rows;
  }
  return [];
}

function isForeignKeyViolation(err: unknown): boolean {
  return collectErrorCode(err) === '23503';
}

function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
      continue;
    }
    if (cur && typeof cur === 'object' && 'message' in cur) {
      parts.push(String((cur as { message: unknown }).message));
    }
    break;
  }
  return parts.join('\n');
}

function collectErrorCode(err: unknown): string {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur && typeof cur === 'object' && 'code' in cur && (cur as { code: unknown }).code) {
      return String((cur as { code: unknown }).code);
    }
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  return '';
}
