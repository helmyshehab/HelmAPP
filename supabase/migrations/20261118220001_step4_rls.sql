-- Helm حلم — Step 4: RLS policies (identity, roles, catalog, pricing, markets, geo)
-- Additive/tightening over Step 2 stubs. Service-role / superuser bypasses RLS;
-- application tests use SET ROLE helm_authenticated + request.jwt.claim.sub.

-- Force RLS even for table owners (not superusers)
alter table identity.user_accounts enable row level security;
alter table identity.user_accounts force row level security;
alter table identity.customer_profiles enable row level security;
alter table identity.customer_profiles force row level security;
alter table identity.user_roles enable row level security;
alter table identity.user_roles force row level security;

alter table catalog.destinations enable row level security;
alter table catalog.destinations force row level security;
alter table catalog.pois enable row level security;
alter table catalog.pois force row level security;
alter table catalog.places enable row level security;
alter table catalog.places force row level security;

alter table packages.packages enable row level security;
alter table packages.packages force row level security;
alter table pricing.price_records enable row level security;
alter table pricing.price_records force row level security;
alter table pricing.currencies enable row level security;
alter table pricing.currencies force row level security;

alter table markets.markets enable row level security;
alter table markets.markets force row level security;
alter table markets.market_destinations enable row level security;
alter table markets.market_destinations force row level security;

alter table geo.countries enable row level security;
alter table geo.countries force row level security;
alter table geo.regions enable row level security;
alter table geo.regions force row level security;
alter table geo.cities enable row level security;
alter table geo.cities force row level security;
alter table geo.areas enable row level security;
alter table geo.areas force row level security;

alter table ops.audit_events enable row level security;
alter table ops.audit_events force row level security;

-- ---------- Identity: accounts ----------
drop policy if exists user_accounts_select_own_or_staff on identity.user_accounts;
create policy user_accounts_select_own_or_staff on identity.user_accounts
  for select
  using (
    auth.uid() = id
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists user_accounts_update_own on identity.user_accounts;
create policy user_accounts_update_own on identity.user_accounts
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists user_accounts_insert_self on identity.user_accounts;
create policy user_accounts_insert_self on identity.user_accounts
  for insert
  with check (auth.uid() = id);

-- ---------- Identity: profiles ----------
drop policy if exists profiles_owner_select on identity.customer_profiles;
create policy profiles_owner_select on identity.customer_profiles
  for select
  using (
    auth.uid() = user_id
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists profiles_owner_update on identity.customer_profiles;
create policy profiles_owner_update on identity.customer_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists profiles_owner_insert on identity.customer_profiles;
create policy profiles_owner_insert on identity.customer_profiles
  for insert
  with check (auth.uid() = user_id);

-- ---------- Identity: roles (no self-privilege escalation) ----------
drop policy if exists user_roles_select_own_or_staff on identity.user_roles;
create policy user_roles_select_own_or_staff on identity.user_roles
  for select
  using (
    auth.uid() = user_id
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

-- Customers may insert only their own *customer* role (bootstrap); never staff roles
drop policy if exists user_roles_insert_customer_self on identity.user_roles;
create policy user_roles_insert_customer_self on identity.user_roles
  for insert
  with check (
    (
      auth.uid() = user_id
      and role = 'customer'::identity.app_role
    )
    or identity.has_role('super-administrator'::identity.app_role)
  );

drop policy if exists user_roles_update_superadmin on identity.user_roles;
create policy user_roles_update_superadmin on identity.user_roles
  for update
  using (identity.has_role('super-administrator'::identity.app_role))
  with check (identity.has_role('super-administrator'::identity.app_role));

drop policy if exists user_roles_delete_superadmin on identity.user_roles;
create policy user_roles_delete_superadmin on identity.user_roles
  for delete
  using (identity.has_role('super-administrator'::identity.app_role));

-- ---------- Catalog read (published) + staff write ----------
drop policy if exists destinations_read_published on catalog.destinations;
create policy destinations_read_published on catalog.destinations
  for select
  using (
    (publish_status = 'published' and verification_status = 'verified')
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists destinations_write_admin on catalog.destinations;
create policy destinations_write_admin on catalog.destinations
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists pois_read_published on catalog.pois;
create policy pois_read_published on catalog.pois
  for select
  using (
    (publish_status = 'published' and verification_status = 'verified')
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists pois_write_admin on catalog.pois;
create policy pois_write_admin on catalog.pois
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists places_read_published on catalog.places;
create policy places_read_published on catalog.places
  for select
  using (
    (publish_status = 'published' and verification_status = 'verified')
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists places_write_admin on catalog.places;
create policy places_write_admin on catalog.places
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists packages_read_published on packages.packages;
create policy packages_read_published on packages.packages
  for select
  using (
    publish_status = 'published'
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists packages_write_admin on packages.packages;
create policy packages_write_admin on packages.packages
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- ---------- Pricing ----------
drop policy if exists currencies_read_all on pricing.currencies;
create policy currencies_read_all on pricing.currencies
  for select
  using (true);

drop policy if exists currencies_write_admin on pricing.currencies;
create policy currencies_write_admin on pricing.currencies
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists price_records_read_published_subject on pricing.price_records;
create policy price_records_read_published_subject on pricing.price_records
  for select
  using (
    identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
    or (
      -- published package prices readable
      subject_type = 'package'
      and exists (
        select 1 from packages.packages p
        where p.id = subject_id and p.publish_status = 'published'
      )
    )
  );

drop policy if exists price_records_write_admin on pricing.price_records;
create policy price_records_write_admin on pricing.price_records
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- ---------- Markets & geo (public read of active; admin write) ----------
drop policy if exists markets_read_active on markets.markets;
create policy markets_read_active on markets.markets
  for select
  using (
    is_active = true
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists markets_write_admin on markets.markets;
create policy markets_write_admin on markets.markets
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists market_destinations_read on markets.market_destinations;
create policy market_destinations_read on markets.market_destinations
  for select
  using (
    is_active = true
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists market_destinations_write_admin on markets.market_destinations;
create policy market_destinations_write_admin on markets.market_destinations
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists countries_read on geo.countries;
create policy countries_read on geo.countries for select using (true);
drop policy if exists regions_read on geo.regions;
create policy regions_read on geo.regions for select using (true);
drop policy if exists cities_read on geo.cities;
create policy cities_read on geo.cities for select using (true);
drop policy if exists areas_read on geo.areas;
create policy areas_read on geo.areas for select using (true);

drop policy if exists countries_write_admin on geo.countries;
create policy countries_write_admin on geo.countries
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists regions_write_admin on geo.regions;
create policy regions_write_admin on geo.regions
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists cities_write_admin on geo.cities;
create policy cities_write_admin on geo.cities
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists areas_write_admin on geo.areas;
create policy areas_write_admin on geo.areas
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- ---------- Audit ----------
drop policy if exists audit_deny_all on ops.audit_events;
drop policy if exists audit_select_admin on ops.audit_events;
create policy audit_select_admin on ops.audit_events
  for select
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists audit_insert_staff on ops.audit_events;
create policy audit_insert_staff on ops.audit_events
  for insert
  with check (
    identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

-- No update/delete policies → denied by default for authenticated
