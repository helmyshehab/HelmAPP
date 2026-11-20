-- Helm حلم — Trip drafts foundation (private customer drafts)
-- Master plan Build workflow minimum fields: owner, optional destination/title,
-- constraints_json (dates/budget/interests/pace/party), status, timestamps.
-- Initial lifecycle is Draft-only; archive/convert deferred until rules exist.
-- Owner-only RLS for create/read/update; owner column is immutable.

create schema if not exists trips;

do $$ begin
  create type trips.trip_draft_status as enum ('draft');
exception
  when duplicate_object then null;
end $$;

create table if not exists trips.trip_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.user_accounts(id) on delete cascade,
  destination_id uuid null references catalog.destinations(id) on delete set null,
  title text null,
  constraints_json jsonb not null default '{}'::jsonb,
  status trips.trip_draft_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_drafts_status_draft_only check (status = 'draft'::trips.trip_draft_status)
);

create index if not exists idx_trip_drafts_user_id
  on trips.trip_drafts (user_id);

create index if not exists idx_trip_drafts_destination_id
  on trips.trip_drafts (destination_id)
  where destination_id is not null;

drop trigger if exists trip_drafts_set_updated_at on trips.trip_drafts;
create trigger trip_drafts_set_updated_at
  before update on trips.trip_drafts
  for each row execute function ops.set_updated_at();

-- Prevent owner reassignment even when RLS is bypassed (service role / table owner).
create or replace function trips.trip_drafts_enforce_immutable_owner()
returns trigger
language plpgsql
set search_path = trips, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'trip draft owner cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trip_drafts_enforce_immutable_owner on trips.trip_drafts;
create trigger trip_drafts_enforce_immutable_owner
  before update on trips.trip_drafts
  for each row execute function trips.trip_drafts_enforce_immutable_owner();

alter table trips.trip_drafts enable row level security;
alter table trips.trip_drafts force row level security;

-- Owner-only create / read / update (no staff access in v1 sketch).
drop policy if exists trip_drafts_owner_select on trips.trip_drafts;
create policy trip_drafts_owner_select on trips.trip_drafts
  for select
  using (auth.uid() = user_id);

drop policy if exists trip_drafts_owner_insert on trips.trip_drafts;
create policy trip_drafts_owner_insert on trips.trip_drafts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists trip_drafts_owner_update on trips.trip_drafts;
create policy trip_drafts_owner_update on trips.trip_drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privileges: this table only (no future-table defaults, sequences, or anon).
grant usage on schema trips to helm_authenticated;
grant select, insert, update on table trips.trip_drafts to helm_authenticated;
