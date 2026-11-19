-- Helm حلم — Step 6.3 database integrity harness
-- Run as a privileged role (e.g. postgres) with ON_ERROR_STOP.
-- Covers parent-cycle rejection, geo FK/match, and audit index presence.
-- Concurrency (two sessions) is covered by Node tests with independent connections.
\set ON_ERROR_STOP on

do $$
declare
  root_id uuid := gen_random_uuid();
  mid_id uuid := gen_random_uuid();
  leaf_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  n int;
begin
  -- Valid nested hierarchy: root → mid → leaf
  insert into catalog.destinations (id, slug, name_en, name_ar, country_code, lifecycle_status)
  values
    (root_id, 's63-root-' || substr(root_id::text, 1, 8), 'S63 Root', 'جذر', 'TR', 'draft'),
    (mid_id, 's63-mid-' || substr(mid_id::text, 1, 8), 'S63 Mid', 'وسط', 'TR', 'draft'),
    (leaf_id, 's63-leaf-' || substr(leaf_id::text, 1, 8), 'S63 Leaf', 'ورقة', 'TR', 'draft'),
    (other_id, 's63-other-' || substr(other_id::text, 1, 8), 'S63 Other', 'آخر', 'TR', 'draft');

  update catalog.destinations set parent_id = root_id where id = mid_id;
  update catalog.destinations set parent_id = mid_id where id = leaf_id;

  select count(*) into n from catalog.destinations
  where id in (root_id, mid_id, leaf_id) and (
    (id = mid_id and parent_id = root_id) or
    (id = leaf_id and parent_id = mid_id) or
    (id = root_id and parent_id is null)
  );
  if n <> 3 then
    raise exception 'valid nested hierarchy was not preserved (%)', n;
  end if;

  -- Self-parent rejected
  begin
    update catalog.destinations set parent_id = root_id where id = root_id;
    raise exception 'self-parent should have been rejected';
  exception
    when check_violation then null;
    when others then
      if sqlerrm like '%cannot reference itself%' or sqlerrm like '%parent_not_self%' then
        null;
      else
        raise;
      end if;
  end;

  -- Direct cycle rejected (root → mid already; mid → root)
  begin
    update catalog.destinations set parent_id = mid_id where id = root_id;
    raise exception 'direct cycle should have been rejected';
  exception
    when check_violation then null;
    when others then
      if sqlerrm like '%hierarchy cycle%' then null; else raise; end if;
  end;

  -- Indirect cycle rejected (leaf under mid under root; root → leaf)
  begin
    update catalog.destinations set parent_id = leaf_id where id = root_id;
    raise exception 'indirect cycle should have been rejected';
  exception
    when check_violation then null;
    when others then
      if sqlerrm like '%hierarchy cycle%' then null; else raise; end if;
  end;

  -- After rejected updates, hierarchy unchanged
  if (select parent_id from catalog.destinations where id = root_id) is not null then
    raise exception 'root parent_id changed after rejected cycle updates';
  end if;
  if (select parent_id from catalog.destinations where id = mid_id) is distinct from root_id then
    raise exception 'mid parent_id changed after rejected cycle updates';
  end if;
  if (select parent_id from catalog.destinations where id = leaf_id) is distinct from mid_id then
    raise exception 'leaf parent_id changed after rejected cycle updates';
  end if;

  -- Valid reparent to unrelated node
  update catalog.destinations set parent_id = other_id where id = leaf_id;
  if (select parent_id from catalog.destinations where id = leaf_id) is distinct from other_id then
    raise exception 'valid reparent to unrelated node failed';
  end if;
  update catalog.destinations set parent_id = mid_id where id = leaf_id;

  -- Unknown country_code rejected by FK
  begin
    update catalog.destinations set country_code = 'ZZ' where id = other_id;
    raise exception 'orphan country_code should have been rejected';
  exception
    when foreign_key_violation then null;
  end;

  -- City/country mismatch rejected
  begin
    update catalog.destinations
    set city_id = 'c2222222-2222-2222-2222-222222222222' -- GE Tbilisi
    where id = other_id; -- country_code TR
    raise exception 'city/country mismatch should have been rejected';
  exception
    when check_violation then null;
    when others then
      if sqlerrm like '%does not match country_code%' then null; else raise; end if;
  end;

  -- Matching city accepted
  update catalog.destinations
  set city_id = 'c1111111-1111-1111-1111-111111111111' -- TR Istanbul
  where id = other_id;

  -- Audit index exists
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'ops'
      and tablename = 'audit_events'
      and indexname = 'idx_audit_events_entity_created'
  ) then
    raise exception 'idx_audit_events_entity_created missing';
  end if;

  -- Cleanup test rows (destination FKs none for these drafts)
  delete from catalog.destinations where id in (root_id, mid_id, leaf_id, other_id);
end
$$;
