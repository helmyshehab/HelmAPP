import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppException } from '../../../common/errors/app.exception';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import {
  expectedDestinationSlugForContent,
  parseBuildCompatiblePackageContent,
} from '../../packages/domain/trip-preview-content';

export type TripRequestStatus = 'submitted' | 'under_review' | 'declined';

export type TripRequestPublic = {
  id: string;
  draftId: string;
  title: string | null;
  destinationSlug: string;
  status: TripRequestStatus;
  constraints: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TripRequestStaff = TripRequestPublic & {
  userId: string;
  staffNote: string | null;
};

const publicProjection = sql`
  id::text as id,
  draft_id::text as "draftId",
  title,
  destination_slug as "destinationSlug",
  status::text as status,
  constraints_json as constraints,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "updatedAt"
`;

const staffProjection = sql`
  ${publicProjection},
  user_id::text as "userId",
  staff_note as "staffNote"
`;

@Injectable()
export class TripRequestsService {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) throw AppException.validation('Trip requests database is not configured');
    return this.db;
  }

  async listForOwner(userId: string): Promise<{ items: TripRequestPublic[] }> {
    const rows = await this.requireDb().execute<TripRequestPublic>(sql`
      select ${publicProjection}
      from trips.trip_requests
      where user_id = ${userId}::uuid
      order by created_at desc, id desc
    `);
    return { items: [...rows] };
  }

  async getForOwner(userId: string, id: string): Promise<TripRequestPublic> {
    const rows = await this.requireDb().execute<TripRequestPublic>(sql`
      select ${publicProjection}
      from trips.trip_requests
      where id = ${id}::uuid and user_id = ${userId}::uuid
      limit 1
    `);
    if (!rows[0]) throw AppException.notFound('Trip request not found');
    return rows[0];
  }

  async listForStaff(id?: string): Promise<{ items: TripRequestStaff[] }> {
    const rows = await this.requireDb().execute<TripRequestStaff>(sql`
      select ${staffProjection}
      from trips.trip_requests
      ${id ? sql`where id = ${id}::uuid` : sql``}
      order by created_at desc, id desc
      limit 25
    `);
    return { items: [...rows] };
  }

  async getForStaff(id: string): Promise<TripRequestStaff> {
    const rows = await this.requireDb().execute<TripRequestStaff>(sql`
      select ${staffProjection}
      from trips.trip_requests
      where id = ${id}::uuid
      limit 1
    `);
    if (!rows[0]) throw AppException.notFound('Trip request not found');
    return rows[0];
  }

  /**
   * Idempotent submit: concurrent retries with the same draft return the same row.
   * Snapshot is taken from the draft at first successful insert only.
   */
  async submit(userId: string, draftId: string): Promise<TripRequestPublic> {
    return this.requireDb().transaction(async (tx) => {
      const owned = await tx.execute<{
        id: string;
        title: string | null;
        constraints: Record<string, unknown>;
      }>(sql`
        select id::text as id, title, constraints_json as constraints
        from trips.trip_drafts
        where id = ${draftId}::uuid and user_id = ${userId}::uuid
        for update
      `);
      if (!owned[0]) throw AppException.notFound('Trip draft not found');

      const existing = await tx.execute<TripRequestPublic>(sql`
        select ${publicProjection}
        from trips.trip_requests
        where draft_id = ${draftId}::uuid
        limit 1
      `);
      if (existing[0]) return existing[0];

      let destinationSlug: string;
      try {
        const parsed = parseBuildCompatiblePackageContent(owned[0].constraints);
        destinationSlug = expectedDestinationSlugForContent(parsed);
      } catch {
        throw AppException.validation(
          'Save a Build-compatible Ubud or Istanbul itinerary before requesting a trip',
        );
      }

      const inserted = await tx.execute<TripRequestPublic>(sql`
        insert into trips.trip_requests (
          user_id, draft_id, title, destination_slug, constraints_json, status
        ) values (
          ${userId}::uuid,
          ${draftId}::uuid,
          ${owned[0].title},
          ${destinationSlug},
          ${JSON.stringify(owned[0].constraints)}::jsonb,
          'submitted'
        )
        on conflict (draft_id) do nothing
        returning ${publicProjection}
      `);
      if (inserted[0]) return inserted[0];

      const raced = await tx.execute<TripRequestPublic>(sql`
        select ${publicProjection}
        from trips.trip_requests
        where draft_id = ${draftId}::uuid
        limit 1
      `);
      if (!raced[0]) throw AppException.conflict('Could not create trip request');
      return raced[0];
    });
  }

  async updateStatus(
    id: string,
    next: TripRequestStatus,
    staffNote?: string | null,
  ): Promise<TripRequestStaff> {
    const current = await this.getForStaff(id);
    if (current.status === 'declined') {
      throw AppException.conflict('Declined trip requests cannot be changed');
    }
    if (next === 'submitted') {
      throw AppException.validation('Cannot move a trip request back to submitted');
    }
    if (current.status === 'submitted' && (next === 'under_review' || next === 'declined')) {
      // ok
    } else if (current.status === 'under_review' && next === 'declined') {
      // ok
    } else if (current.status === next) {
      // idempotent no-op status
    } else {
      throw AppException.conflict(
        `Cannot move trip request from ${current.status} to ${next}`,
      );
    }

    const noteClause =
      staffNote === undefined
        ? sql``
        : sql`, staff_note = ${staffNote}`;

    const rows = await this.requireDb().execute<TripRequestStaff>(sql`
      update trips.trip_requests
      set status = ${next}::trips.trip_request_status
          ${noteClause},
          updated_at = clock_timestamp()
      where id = ${id}::uuid
      returning ${staffProjection}
    `);
    if (!rows[0]) throw AppException.notFound('Trip request not found');
    return rows[0];
  }
}
