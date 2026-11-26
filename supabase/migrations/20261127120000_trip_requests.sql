-- Trip requests: immutable itinerary snapshot submitted from a private draft.
-- One request per draft. Declined is final in v1. Drafts remain independently editable.

do $$ begin
  create type trips.trip_request_status as enum ('submitted', 'under_review', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists trips.trip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.user_accounts(id) on delete cascade,
  draft_id uuid not null,
  title text null,
  destination_slug text not null,
  constraints_json jsonb not null check (jsonb_typeof(constraints_json) = 'object'),
  status trips.trip_request_status not null default 'submitted',
  staff_note text null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint trip_requests_one_per_draft unique (draft_id)
);

create index if not exists idx_trip_requests_owner_created
  on trips.trip_requests (user_id, created_at desc, id desc);

create index if not exists idx_trip_requests_status_created
  on trips.trip_requests (status, created_at desc, id desc);

drop trigger if exists trip_requests_set_updated_at on trips.trip_requests;
create trigger trip_requests_set_updated_at
  before update on trips.trip_requests
  for each row execute function ops.set_updated_at();

alter table trips.trip_requests enable row level security;
alter table trips.trip_requests force row level security;

drop policy if exists trip_requests_owner_select on trips.trip_requests;
create policy trip_requests_owner_select on trips.trip_requests
  for select
  using (auth.uid() = user_id);

-- Inserts/updates go through Nest with elevated DB role; keep RLS tight for JWT clients.
revoke all on trips.trip_requests from public, helm_authenticated;
grant select on trips.trip_requests to helm_authenticated;
