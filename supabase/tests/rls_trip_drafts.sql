-- Helm حلم — Trip drafts ownership isolation (Customer A vs Customer B)
-- Runs as postgres initially so a second customer account can be provisioned,
-- then switches to helm_authenticated + JWT sub claims.
\set ON_ERROR_STOP on

begin;

-- Harness role setup (kept out of migrations): allow SET ROLE on local Supabase.
grant helm_authenticated to current_user;

-- Customer B account (local harness only; not linked by email to A)
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
  draft_id uuid;
  n int;
  title_val text;
  constraints_val jsonb;
begin
  -- ========== Customer A: create / reopen / edit ==========
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

  insert into trips.trip_drafts (user_id, title, constraints_json, status)
  values (
    '55555555-5555-5555-5555-555555555555',
    'A Bali draft',
    jsonb_build_object(
      'dates', jsonb_build_object('start', '2026-12-01', 'end', '2026-12-08'),
      'budget_band_egp', jsonb_build_object('min', 30000, 'max', 60000),
      'party', jsonb_build_object('adults', 2, 'children', 0),
      'pace', 'balanced',
      'interests', jsonb_build_array('food', 'culture')
    ),
    'draft'
  )
  returning id into draft_id;

  select count(*) into n from trips.trip_drafts where id = draft_id;
  if n <> 1 then
    raise exception 'customer A cannot reopen own draft (count=%)', n;
  end if;

  update trips.trip_drafts
    set title = 'A Bali draft (edited)',
        constraints_json = constraints_json || jsonb_build_object('pace', 'relaxed')
    where id = draft_id;

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'customer A edit affected % rows', n;
  end if;

  select title, constraints_json into title_val, constraints_val
  from trips.trip_drafts where id = draft_id;
  if title_val is distinct from 'A Bali draft (edited)' then
    raise exception 'customer A reopen after edit missing title';
  end if;
  if constraints_val->>'pace' is distinct from 'relaxed' then
    raise exception 'customer A reopen after edit missing pace';
  end if;

  -- Draft-only lifecycle: customers cannot set a converted status.
  -- Catch only the enum rejection (22P02). A successful UPDATE raises below
  -- and must escape this handler so the test fails.
  begin
    update trips.trip_drafts
      set status = 'converted'::trips.trip_draft_status
      where id = draft_id;
    raise exception 'customer A set converted status on a draft';
  exception
    when invalid_text_representation then
      null; -- sqlstate 22P02: 'converted' is not a trip_draft_status value
  end;

  select status::text into title_val from trips.trip_drafts where id = draft_id;
  if title_val is distinct from 'draft' then
    raise exception 'draft status changed after converted attempt (got %)', title_val;
  end if;

  -- A cannot transfer ownership to B (RLS WITH CHECK + immutable owner trigger)
  begin
    update trips.trip_drafts
      set user_id = '99999999-9999-9999-9999-999999999999'
      where id = draft_id;
    raise exception 'customer A transferred draft ownership to B';
  exception
    when others then
      if sqlerrm like '%row-level security%'
         or sqlerrm like '%policy%'
         or sqlerrm like '%owner cannot be changed%'
         or sqlstate = '23514' then
        null;
      else
        raise;
      end if;
  end;

  select user_id::text into title_val from trips.trip_drafts where id = draft_id;
  if title_val is distinct from '55555555-5555-5555-5555-555555555555' then
    raise exception 'draft owner changed after transfer attempt';
  end if;

  -- ========== Customer B: cannot see / edit / claim ==========
  perform set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);

  select count(*) into n from trips.trip_drafts where id = draft_id;
  if n <> 0 then
    raise exception 'customer B can see customer A draft';
  end if;

  select count(*) into n from trips.trip_drafts;
  if n <> 0 then
    raise exception 'customer B list leaked other drafts (count=%)', n;
  end if;

  update trips.trip_drafts
    set title = 'claimed by B'
    where id = draft_id;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'customer B edited customer A draft';
  end if;

  -- Claim attempt: insert a draft owned by A
  begin
    insert into trips.trip_drafts (user_id, title, constraints_json, status)
    values (
      '55555555-5555-5555-5555-555555555555',
      'B claiming as A',
      '{}'::jsonb,
      'draft'
    );
    raise exception 'customer B created a draft owned by A';
  exception
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%policy%' then
        null;
      else
        raise;
      end if;
  end;

  -- Claim attempt: invent a row id and try to update owner to self (still invisible)
  update trips.trip_drafts
    set user_id = '99999999-9999-9999-9999-999999999999',
        title = 'stolen'
    where id = draft_id;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'customer B claimed customer A draft via update';
  end if;

  -- B can still create their own draft
  insert into trips.trip_drafts (user_id, title, constraints_json, status)
  values (
    '99999999-9999-9999-9999-999999999999',
    'B own draft',
    jsonb_build_object('pace', 'packed'),
    'draft'
  );
  select count(*) into n from trips.trip_drafts;
  if n <> 1 then
    raise exception 'customer B should see only own draft, got %', n;
  end if;

  raise notice 'RLS_TRIP_DRAFTS_OK';
end $$;

rollback;
