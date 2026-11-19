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
-- Problem: a recursive CTE alone inside a BEFORE ROW trigger is racy — two
-- concurrent transactions can each observe an acyclic graph, then commit a
-- mutual parent swap (A→B and B→A).
--
-- Database trigger (final integrity authority for all writers, including
-- direct SQL):
--   * BEFORE INSERT OR UPDATE OF parent_id runs
--     catalog.enforce_destination_parent_acyclic().
--   * Takes pg_advisory_xact_lock(hashtext(
--       'catalog.destinations.parent_hierarchy')) then walks ancestors.
--   * Rejects self-parent and ancestor cycles (CHECK also blocks self-parent).
--
-- IMPORTANT — lock ordering for UPDATE:
--   PostgreSQL acquires the UPDATE *target* row lock BEFORE BEFORE-ROW
--   triggers run. Therefore this trigger's advisory lock is NOT acquired
--   before the mutating row lock. Concurrent direct-SQL mutual reparents
--   (A→B and B→A) can DEADLOCK (40P01) via that row lock + advisory/FK
--   waits. Deadlock aborts one writer; cycles still do not persist.
--   Do NOT claim the trigger alone provides deadlock-free serialization
--   for direct SQL.
--
-- Application (Nest CatalogRepository) — deadlock-avoiding path:
--   * Before any INSERT/UPDATE that changes parent_id, acquire the SAME
--     transaction-scoped advisory lock key in the same transaction, then
--     issue the mutating SQL. That places the advisory lock before
--     destination row locks for app-mediated writes.
--   * Covered paths: createDestination (when parentId set),
--     updateDestination (when parentId changes). Import writer does not
--     set parent_id.
--
-- Lock scope: one global key for all catalog.destinations parent_id mutations
-- (held until COMMIT/ROLLBACK).
-- Guarantees:
--   * App-mediated parent changes: serialized without mutual-swap deadlock;
--     second writer sees prior commit and gets a cycle rejection.
--   * Direct SQL: cycle rejection OR deadlock abort; final graph stays acyclic.
--   * Trigger remains the final integrity backstop for every writer.
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
set search_path = catalog, pg_temp
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

  -- Serialize hierarchy checks for this transaction. Note: for UPDATE, the
  -- target row is already locked by PostgreSQL before this trigger runs.
  perform pg_advisory_xact_lock(lock_key);

  -- Lock involved rows in id order after the advisory lock (extra safety for
  -- reads; mutual UPDATE reparents may still deadlock — see header comment).
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
  'Uses pg_advisory_xact_lock(hashtext(''catalog.destinations.parent_hierarchy'')). '
  'Nest acquires the same lock before parent mutations to avoid UPDATE deadlocks; '
  'direct SQL mutual reparents may still deadlock (40P01) while remaining acyclic.';

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
set search_path = catalog, geo, pg_temp
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
