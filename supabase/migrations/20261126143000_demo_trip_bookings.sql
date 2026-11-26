create schema if not exists bookings;

-- Keep a snapshot independent of future edits to the source draft or quote.
create table if not exists bookings.demo_trip_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.user_accounts(id) on delete cascade,
  draft_id uuid not null,
  quote_id uuid not null unique,
  title text null,
  quote_json jsonb not null check (jsonb_typeof(quote_json) = 'object'),
  constraints_json jsonb not null check (jsonb_typeof(constraints_json) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_demo_trip_bookings_owner_created
  on bookings.demo_trip_bookings (user_id, created_at desc, id desc);

alter table bookings.demo_trip_bookings enable row level security;
revoke all on bookings.demo_trip_bookings from public, helm_authenticated;
