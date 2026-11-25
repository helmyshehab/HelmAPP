-- Helm حلم — Itinerary days/items ownership isolation (Customer A vs Customer B)
-- Owner CRUD, cross-account denial, and reparenting into another customer's draft.
\set ON_ERROR_STOP on

begin;

grant helm_authenticated to current_user;

-- Customer B account (local harness only)
insert into identity.user_accounts (id, auth_provider_ref, primary_email, status)
values (
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'demo.customer.b@helm.local',
  'active'
) on conflict (id) do update set
  auth_provider_ref = excluded.auth_provider_ref,
  primary_email = excluded.primary_email,
  status = excluded.status;

insert into identity.customer_profiles (
  user_id, display_name, preferred_locale, preferred_currency, preferences_json
) values (
  '99999999-9999-9999-9999-999999999999',
  'Demo Traveler B',
  'ar',
  'EGP',
  '{}'::jsonb
) on conflict (user_id) do nothing;

insert into identity.user_roles (user_id, role, granted_by)
select '99999999-9999-9999-9999-999999999999', 'customer'::identity.app_role, null
where not exists (
  select 1 from identity.user_roles
  where user_id = '99999999-9999-9999-9999-999999999999'
    and role = 'customer'
    and revoked_at is null
);

set local role helm_authenticated;

do $$
declare
  draft_a uuid;
  draft_b uuid;
  day_a1 uuid;
  day_a2 uuid;
  day_b uuid;
  item_a uuid;
  n int;
  title_val text;
  parent_id uuid;
  missing_day uuid := '00000000-0000-4000-8000-000000000099';
  missing_state text;
  missing_msg text;
  other_state text;
  other_msg text;
begin
  -- ========== Customer A: draft + itinerary CRUD ==========
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  insert into trips.trip_drafts (user_id, title, constraints_json, status)
  values (
    '55555555-5555-5555-5555-555555555555',
    'A itinerary draft',
    jsonb_build_object('pace', 'balanced'),
    'draft'
  )
  returning id into draft_a;

  insert into trips.itinerary_days (draft_id, position, label)
  values (draft_a, 1, 'Day 1')
  returning id into day_a1;

  insert into trips.itinerary_days (draft_id, position, label)
  values (draft_a, 2, 'Day 2')
  returning id into day_a2;

  insert into trips.itinerary_items (day_id, position, title, notes)
  values (day_a1, 1, 'Temple visit', 'Morning')
  returning id into item_a;

  select count(*) into n from trips.itinerary_days where draft_id = draft_a;
  if n <> 2 then
    raise exception 'customer A day list count=%', n;
  end if;

  select count(*) into n from trips.itinerary_items where day_id = day_a1;
  if n <> 1 then
    raise exception 'customer A item list count=%', n;
  end if;

  update trips.itinerary_items
    set title = 'Temple visit (edited)',
        notes = 'Late morning'
    where id = item_a;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'customer A item edit affected % rows', n;
  end if;

  select title into title_val from trips.itinerary_items where id = item_a;
  if title_val is distinct from 'Temple visit (edited)' then
    raise exception 'customer A item edit missing title';
  end if;

  -- Move item to another day on the SAME draft (allowed)
  update trips.itinerary_items
    set day_id = day_a2,
        position = 1
    where id = item_a;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'customer A same-draft item move affected % rows', n;
  end if;

  select day_id into parent_id from trips.itinerary_items where id = item_a;
  if parent_id is distinct from day_a2 then
    raise exception 'customer A same-draft item move failed';
  end if;

  -- Move back to day 1 for later assertions
  update trips.itinerary_items
    set day_id = day_a1,
        position = 1
    where id = item_a;

  -- Ordering constraints: duplicate / non-positive positions rejected
  begin
    insert into trips.itinerary_days (draft_id, position, label)
    values (draft_a, 1, 'dup');
    raise exception 'duplicate day position was accepted';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into trips.itinerary_items (day_id, position, title)
    values (day_a1, 1, 'dup item');
    raise exception 'duplicate item position was accepted';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into trips.itinerary_days (draft_id, position, label)
    values (draft_a, 0, 'bad');
    raise exception 'non-positive day position was accepted';
  exception
    when check_violation then
      null;
  end;

  -- Existing draft row still readable after itinerary writes
  select title into title_val from trips.trip_drafts where id = draft_a;
  if title_val is distinct from 'A itinerary draft' then
    raise exception 'existing draft title broken after itinerary CRUD';
  end if;

  -- ========== Customer B: own draft, deny A itinerary, deny reparent ==========
  perform set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);

  insert into trips.trip_drafts (user_id, title, constraints_json, status)
  values (
    '99999999-9999-9999-9999-999999999999',
    'B itinerary draft',
    '{}'::jsonb,
    'draft'
  )
  returning id into draft_b;

  insert into trips.itinerary_days (draft_id, position, label)
  values (draft_b, 1, 'B Day 1')
  returning id into day_b;

  select count(*) into n from trips.itinerary_days where id = day_a1;
  if n <> 0 then
    raise exception 'customer B can see customer A day';
  end if;

  select count(*) into n from trips.itinerary_items where id = item_a;
  if n <> 0 then
    raise exception 'customer B can see customer A item';
  end if;

  update trips.itinerary_items
    set title = 'stolen by B'
    where id = item_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'customer B edited customer A item';
  end if;

  -- B cannot attach a day to A's draft
  begin
    insert into trips.itinerary_days (draft_id, position, label)
    values (draft_a, 3, 'B on A draft');
    raise exception 'customer B created a day on customer A draft';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then
        null;
      else
        raise;
      end if;
  end;

  -- B cannot reparent A's item onto B's day (invisible row under RLS)
  update trips.itinerary_items
    set day_id = day_b,
        position = 2
    where id = item_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'customer B reparented customer A item onto B day';
  end if;

  -- A cannot reparent own day onto B's draft (immutable draft_id + RLS)
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  begin
    update trips.itinerary_days
      set draft_id = draft_b
      where id = day_a1;
    raise exception 'customer A reparented day onto customer B draft';
  exception
    when others then
      if sqlerrm like '%row-level security%'
         or sqlerrm like '%policy%'
         or sqlerrm like '%draft_id cannot be changed%'
         or sqlstate = '23514' then
        null;
      else
        raise;
      end if;
  end;

  select draft_id into parent_id from trips.itinerary_days where id = day_a1;
  if parent_id is distinct from draft_a then
    raise exception 'day draft_id changed after reparent attempt';
  end if;

  -- Missing day and another customer's day must deny with the same error
  -- (no existence leak) and leave the item on day_a1.
  begin
    update trips.itinerary_items
      set day_id = missing_day,
          position = 3
      where id = item_a;
    raise exception 'customer A reparented item onto missing day';
  exception
    when others then
      if sqlerrm = 'customer A reparented item onto missing day' then
        raise;
      end if;
      missing_state := sqlstate;
      missing_msg := sqlerrm;
  end;

  begin
    update trips.itinerary_items
      set day_id = day_b,
          position = 3
      where id = item_a;
    raise exception 'customer A reparented item onto customer B day';
  exception
    when others then
      if sqlerrm = 'customer A reparented item onto customer B day' then
        raise;
      end if;
      other_state := sqlstate;
      other_msg := sqlerrm;
  end;

  if missing_state is distinct from other_state
     or missing_msg is distinct from other_msg then
    raise exception
      'missing vs other-customer day denial mismatch: missing=(% / %) other=(% / %)',
      missing_state, missing_msg, other_state, other_msg;
  end if;

  if missing_state is distinct from '23503'
     or missing_msg is distinct from 'itinerary item day must reference an existing day' then
    raise exception
      'expected foreign_key_violation existing-day message, got % / %',
      missing_state, missing_msg;
  end if;

  select day_id into parent_id from trips.itinerary_items where id = item_a;
  if parent_id is distinct from day_a1 then
    raise exception 'item day_id changed after denied reparent attempts';
  end if;

  -- Delete path (owner CRUD)
  delete from trips.itinerary_items where id = item_a;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'customer A item delete affected % rows', n;
  end if;

  delete from trips.itinerary_days where draft_id = draft_a;
  get diagnostics n = row_count;
  if n <> 2 then
    raise exception 'customer A day delete affected % rows', n;
  end if;

  -- Draft still exists after itinerary delete
  select count(*) into n from trips.trip_drafts where id = draft_a;
  if n <> 1 then
    raise exception 'draft missing after itinerary delete';
  end if;

  raise notice 'RLS_TRIP_ITINERARY_OK';
end $$;

rollback;
