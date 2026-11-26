import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception';
import { DRIZZLE, type DrizzleClient } from '../../infrastructure/adapters/drizzle/drizzle.client';
import { ubudQuoteRateVersion } from '../trip_builder/domain/ubud-draft-quote';
import type { TripDraftQuote } from '../trip_builder/infrastructure/trip-drafts.repository';

export const demoBookingServices = ['flights', 'stay', 'activities'] as const;
type DemoBookingService = (typeof demoBookingServices)[number];

type DemoTripBooking = {
  id: string;
  draftId: string;
  title: string | null;
  status: 'pending_confirmation' | 'confirmed';
  services: { kind: DemoBookingService; confirmedAt: string | null }[];
  quote: TripDraftQuote;
  constraints: Record<string, unknown>;
  createdAt: string;
};

const hasPaidActivities = sql`(quote_json ->> 'activitiesTotalEgp')::integer > 0`;
const bookingProjection = sql`
  id::text as id, draft_id::text as "draftId", title,
  case when confirmations ?& array['flights', 'stay']
    and (not (${hasPaidActivities}) or confirmations ? 'activities')
    then 'confirmed' else 'pending_confirmation' end as status,
  jsonb_build_array(
    jsonb_build_object('kind', 'flights', 'confirmedAt', confirmations -> 'flights' ->> 'confirmedAt'),
    jsonb_build_object('kind', 'stay', 'confirmedAt', confirmations -> 'stay' ->> 'confirmedAt')
  ) || case when ${hasPaidActivities} then jsonb_build_array(
    jsonb_build_object('kind', 'activities', 'confirmedAt', confirmations -> 'activities' ->> 'confirmedAt')
  ) else '[]'::jsonb end as services,
  quote_json as quote,
  constraints_json as constraints,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt"
`;

@Injectable()
export class DemoTripBookingsService {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) throw AppException.validation('Bookings database is not configured');
    return this.db;
  }

  async list(userId: string): Promise<{ items: DemoTripBooking[] }> {
    const rows = await this.requireDb().execute<DemoTripBooking>(sql`
      select ${bookingProjection}
      from bookings.demo_trip_bookings
      where user_id = ${userId}::uuid
      order by created_at desc, id desc
    `);
    return { items: [...rows] };
  }

  async confirmService(id: string, kind: DemoBookingService, staffId: string): Promise<DemoTripBooking> {
    const rows = await this.requireDb().execute<DemoTripBooking>(sql`
      update bookings.demo_trip_bookings
      set confirmations = case when confirmations ? ${kind} then confirmations
        else confirmations || jsonb_build_object(
          ${kind}::text, jsonb_build_object('confirmedAt', clock_timestamp(), 'confirmedBy', ${staffId}::uuid)
        ) end
      where id = ${id}::uuid and (${kind} <> 'activities' or ${hasPaidActivities})
      returning ${bookingProjection}
    `);
    if (!rows[0]) throw AppException.notFound('Demo booking service not found');
    return rows[0];
  }

  async checkout(userId: string, draftId: string, quoteId: string): Promise<DemoTripBooking> {
    return this.requireDb().transaction(async (tx) => {
      // Quote writes and draft updates also take this lock. Each checkout sees
      // a single draft revision and concurrent retries run in order.
      const owned = await tx.execute(sql`
        select id from trips.trip_drafts
        where id = ${draftId}::uuid and user_id = ${userId}::uuid
        for update
      `);
      if (!owned[0]) throw AppException.notFound('Trip draft not found');

      const existing = await tx.execute<DemoTripBooking>(sql`
        select ${bookingProjection}
        from bookings.demo_trip_bookings
        where user_id = ${userId}::uuid and draft_id = ${draftId}::uuid
          and quote_id = ${quoteId}::uuid
      `);
      if (existing[0]) return existing[0];

      const booked = await tx.execute<DemoTripBooking>(sql`
        insert into bookings.demo_trip_bookings (
          user_id, draft_id, quote_id, title, quote_json, constraints_json
        )
        select d.user_id, d.id, q.id, d.title,
          q.price_json || jsonb_build_object(
            'id', q.id, 'draftId', d.id,
            'createdAt', q.created_at, 'expiresAt', q.expires_at
          ),
          d.constraints_json
        from trips.trip_drafts d
        join trips.trip_draft_quotes q on q.draft_id = d.id
        where d.id = ${draftId}::uuid and d.user_id = ${userId}::uuid
          and q.id = ${quoteId}::uuid
          and q.draft_updated_at = d.updated_at
          and q.expires_at > statement_timestamp()
          and q.price_json ->> 'rateVersion' = ${ubudQuoteRateVersion}
          and q.price_json ->> 'source' = 'demo'
        returning ${bookingProjection}
      `);
      if (!booked[0]) throw AppException.conflict('Request a current quote before checkout');
      return booked[0];
    });
  }
}
