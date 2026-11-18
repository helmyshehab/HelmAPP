-- Step 6.3 — Database integrity & hardening (additive only)
--
-- 1) Destination parent-cycle prevention (mandatory)
-- 2) Audit entity lookup index for admin history pagination
-- 3) Geographic referential integrity (country_code FK + city/country match)
--
-- Never edits prior migrations. Preserves RLS / FORCE RLS unchanged.
--
-- ---------------------------------------------------------------------------
-- Parent hierarchy locking strategy
-- ---------------------------------------------------------------------------
-- Problem: a row-level BEFORE trigger that only runs a recursive ancestor CTE
-- is racy. Two concurrent transactions can each see an acyclic graph, then
-- commit a mutual parent swap (A→B and B→A) that forms a cycle.
--
-- Strategy:
--   1. Take a single transaction-scoped advisory lock
--      `pg_advisory_xact_lock(hashtext('catalog.destinations.parent_hierarchy'))`
--      BEFORE any row locks in this function. One key serializes ALL parent_id
--      mutations on catalog.destinations for the duration of the writing
--      transaction (held until COMMIT/ROLLBACK).
--   2. Lock the mutating row and the new parent with SELECT … FOR UPDATE,
--      ordered by id to keep lock acquisition order stable.
--   3. Recursively walk ancestors of the new parent; reject if NEW.id appears
--      (indirect cycle) or if NEW.parent_id = NEW.id (self-parent; also CHECK).
--
-- Lock scope: global to destination hierarchy mutations (not per-subtree).
-- Rationale: correct under concurrency with a simple deadlock profile.
-- Deadlocks: hierarchy writers that always take the advisory lock first cannot
-- deadlock each other on this key. Deadlock remains possible only if some other
-- session locks destination rows first and later waits on this advisory lock
-- while a hierarchy writer holds the advisory lock and waits on those rows —
-- application writers should acquire the same advisory lock (or avoid holding
-- destination row locks across unrelated work) when mutating parent_id.
-- The database remains the final integrity authority for cycles.
-- ---------------------------------------------------------------------------

-- Self-parent CHECK (belt-and-suspenders with the trigger).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'destinations_parent_not_self'
      and conrelid = 'catalog.destinations'::regclass
  ) then
    alter table catalog.destinations
      add constraint destinations_parent_not_self
      check (parent_id is distinct from id);
  end if;
end
$$;

create or replace function catalog.enforce_destination_parent_acyclic()
returns trigger
language plpgsql
as $$
declare
  lock_key integer := hashtext('catalog.destinations.parent_hierarchy');
begin
  -- Skip when parent_id did not change (UPDATE of other columns).
  if tg_op = 'UPDATE' and new.parent_id is not distinct from old.parent_id then
    return new;
  end if;

  -- Clearing the parent cannot introduce a cycle.
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'destination parent_id cannot reference itself (id=%)', new.id
      using errcode = '23514';
  end if;

  -- Serialize hierarchy mutations for this transaction before row locks.
  perform pg_advisory_xact_lock(lock_key);

  -- Lock involved rows in id order after the advisory lock.
  perform 1
  from catalog.destinations
  where id in (new.id, new.parent_id)
  order by id
  for update;

  if not exists (
    select 1 from catalog.destinations where id = new.parent_id
  ) then
    raise exception 'parent destination % does not exist', new.parent_id
      using errcode = '23503';
  end if;

  -- Reject if walking ancestors of the new parent reaches the child (NEW.id).
  if exists (
    with recursive ancestors as (
      select d.id, d.parent_id, 1 as depth
      from catalog.destinations d
      where d.id = new.parent_id
      union all
      select p.id, p.parent_id, a.depth + 1
      from catalog.destinations p
      join ancestors a on p.id = a.parent_id
      where a.depth < 64
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception
      'destination parent_id would create a hierarchy cycle (id=%, parent_id=%)',
      new.id, new.parent_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function catalog.enforce_destination_parent_acyclic() is
  'Rejects self-parent and ancestor cycles on catalog.destinations.parent_id. '
  'Uses pg_advisory_xact_lock(hashtext(''catalog.destinations.parent_hierarchy'')) '
  'before FOR UPDATE row locks, then a recursive ancestor walk.';

drop trigger if exists destinations_enforce_parent_acyclic on catalog.destinations;
create trigger destinations_enforce_parent_acyclic
  before insert or update of parent_id on catalog.destinations
  for each row
  execute function catalog.enforce_destination_parent_acyclic();

-- ---------------------------------------------------------------------------
-- Audit history index (matches GET /v1/admin/audit-events filters + ORDER BY)
-- Query pattern: WHERE entity_type = $1 AND entity_id = $2
--                ORDER BY created_at DESC, id DESC LIMIT/OFFSET
-- No actor/action filters exist on the current API — omit those indexes.
-- ---------------------------------------------------------------------------
create index if not exists idx_audit_events_entity_created
  on ops.audit_events (entity_type, entity_id, created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- Geographic referential integrity
-- city_id → geo.cities already exists (Step 4).
-- country_code → geo.countries was missing; seed/import use real country codes.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from catalog.destinations d
    left join geo.countries c on c.code = d.country_code
    where c.code is null
  ) then
    raise exception
      'cannot add destinations_country_code_fkey: orphan country_code values exist';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'destinations_country_code_fkey'
      and conrelid = 'catalog.destinations'::regclass
  ) then
    alter table catalog.destinations
      add constraint destinations_country_code_fkey
      foreign key (country_code) references geo.countries (code);
  end if;
end
$$;

-- When city_id is set, require the city's country_code to match the destination.
create or replace function catalog.enforce_destination_city_country()
returns trigger
language plpgsql
as $$
declare
  city_country char(2);
begin
  if new.city_id is null then
    return new;
  end if;

  select c.country_code into city_country
  from geo.cities c
  where c.id = new.city_id;

  if city_country is null then
    raise exception 'destination city_id % does not exist', new.city_id
      using errcode = '23503';
  end if;

  if city_country is distinct from new.country_code then
    raise exception
      'destination city_id country (%) does not match country_code (%)',
      city_country, new.country_code
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists destinations_enforce_city_country on catalog.destinations;
create trigger destinations_enforce_city_country
  before insert or update of city_id, country_code on catalog.destinations
  for each row
  execute function catalog.enforce_destination_city_country();
