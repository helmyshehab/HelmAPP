-- Helm حلم — Editable itinerary foundation for private trip drafts
-- Ordered days (per draft) and ordered items (per day).
-- Ownership is inherited from the parent trips.trip_drafts row (no denormalized user_id).
-- Cross-account access is denied via RLS that joins to the owned draft.

-- ---------------------------------------------------------------------------
-- Days
-- ---------------------------------------------------------------------------
create table if not exists trips.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references trips.trip_drafts(id) on delete cascade,
  position integer not null,
  label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_days_position_positive check (position >= 1),
  constraint itinerary_days_draft_position_unique unique (draft_id, position)
);

create index if not exists idx_itinerary_days_draft_id
  on trips.itinerary_days (draft_id);

drop trigger if exists itinerary_days_set_updated_at on trips.itinerary_days;
create trigger itinerary_days_set_updated_at
  before update on trips.itinerary_days
  for each row execute function ops.set_updated_at();

-- Prevent moving a day onto a different draft when RLS is bypassed.
create or replace function trips.itinerary_days_enforce_immutable_draft()
returns trigger
language plpgsql
set search_path = trips, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.draft_id is distinct from old.draft_id then
    raise exception 'itinerary day draft_id cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists itinerary_days_enforce_immutable_draft on trips.itinerary_days;
create trigger itinerary_days_enforce_immutable_draft
  before update on trips.itinerary_days
  for each row execute function trips.itinerary_days_enforce_immutable_draft();

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------
create table if not exists trips.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references trips.itinerary_days(id) on delete cascade,
  position integer not null,
  title text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_items_position_positive check (position >= 1),
  constraint itinerary_items_day_position_unique unique (day_id, position)
);

create index if not exists idx_itinerary_items_day_id
  on trips.itinerary_items (day_id);

drop trigger if exists itinerary_items_set_updated_at on trips.itinerary_items;
create trigger itinerary_items_set_updated_at
  before update on trips.itinerary_items
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ownership helpers (SECURITY INVOKER; rely on auth.uid())
-- ---------------------------------------------------------------------------
create or replace function trips.draft_owned_by_uid(p_draft_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = trips, pg_temp
as $$
  select exists (
    select 1
    from trips.trip_drafts d
    where d.id = p_draft_id
      and d.user_id = auth.uid()
  );
$$;

create or replace function trips.day_owned_by_uid(p_day_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = trips, pg_temp
as $$
  select exists (
    select 1
    from trips.itinerary_days day
    join trips.trip_drafts d on d.id = day.draft_id
    where day.id = p_day_id
      and d.user_id = auth.uid()
  );
$$;

-- Same-draft day moves are allowed; cross-draft reparenting is blocked even if RLS is bypassed.
-- SECURITY DEFINER so day lookups are not hidden by itinerary_days RLS during the check.
-- Authenticated customers must not distinguish a missing day from another customer's day
-- (same SQLSTATE + message). Explicit cross-draft denial remains when the destination is
-- visible to the caller, or when RLS is bypassed (no JWT uid).
create or replace function trips.itinerary_items_enforce_same_draft_day()
returns trigger
language plpgsql
security definer
set search_path = trips, pg_temp
as $$
declare
  old_draft_id uuid;
  new_draft_id uuid;
begin
  if tg_op = 'UPDATE' and new.day_id is distinct from old.day_id then
    select draft_id into old_draft_id from trips.itinerary_days where id = old.day_id;
    select draft_id into new_draft_id from trips.itinerary_days where id = new.day_id;
    if old_draft_id is null or new_draft_id is null then
      raise exception 'itinerary item day must reference an existing day'
        using errcode = 'foreign_key_violation';
    end if;
    if new_draft_id is distinct from old_draft_id then
      -- Hide existence of other customers' days from authenticated callers.
      if auth.uid() is not null and not trips.day_owned_by_uid(new.day_id) then
        raise exception 'itinerary item day must reference an existing day'
          using errcode = 'foreign_key_violation';
      end if;
      raise exception 'itinerary item cannot move to a day on another draft'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists itinerary_items_enforce_same_draft_day on trips.itinerary_items;
create trigger itinerary_items_enforce_same_draft_day
  before update on trips.itinerary_items
  for each row execute function trips.itinerary_items_enforce_same_draft_day();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table trips.itinerary_days enable row level security;
alter table trips.itinerary_days force row level security;

drop policy if exists itinerary_days_owner_select on trips.itinerary_days;
create policy itinerary_days_owner_select on trips.itinerary_days
  for select
  using (trips.draft_owned_by_uid(draft_id));

drop policy if exists itinerary_days_owner_insert on trips.itinerary_days;
create policy itinerary_days_owner_insert on trips.itinerary_days
  for insert
  with check (trips.draft_owned_by_uid(draft_id));

drop policy if exists itinerary_days_owner_update on trips.itinerary_days;
create policy itinerary_days_owner_update on trips.itinerary_days
  for update
  using (trips.draft_owned_by_uid(draft_id))
  with check (trips.draft_owned_by_uid(draft_id));

drop policy if exists itinerary_days_owner_delete on trips.itinerary_days;
create policy itinerary_days_owner_delete on trips.itinerary_days
  for delete
  using (trips.draft_owned_by_uid(draft_id));

alter table trips.itinerary_items enable row level security;
alter table trips.itinerary_items force row level security;

drop policy if exists itinerary_items_owner_select on trips.itinerary_items;
create policy itinerary_items_owner_select on trips.itinerary_items
  for select
  using (trips.day_owned_by_uid(day_id));

drop policy if exists itinerary_items_owner_insert on trips.itinerary_items;
create policy itinerary_items_owner_insert on trips.itinerary_items
  for insert
  with check (trips.day_owned_by_uid(day_id));

drop policy if exists itinerary_items_owner_update on trips.itinerary_items;
create policy itinerary_items_owner_update on trips.itinerary_items
  for update
  using (trips.day_owned_by_uid(day_id))
  with check (trips.day_owned_by_uid(day_id));

drop policy if exists itinerary_items_owner_delete on trips.itinerary_items;
create policy itinerary_items_owner_delete on trips.itinerary_items
  for delete
  using (trips.day_owned_by_uid(day_id));

-- Privileges: these tables only (no future-table defaults or anon).
grant select, insert, update, delete on table trips.itinerary_days to helm_authenticated;
grant select, insert, update, delete on table trips.itinerary_items to helm_authenticated;
grant execute on function trips.draft_owned_by_uid(uuid) to helm_authenticated;
grant execute on function trips.day_owned_by_uid(uuid) to helm_authenticated;
