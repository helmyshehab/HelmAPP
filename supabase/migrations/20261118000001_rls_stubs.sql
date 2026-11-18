-- Helm حلم — RLS policy stubs (Step 2)
-- Policies are intentionally minimal; tighten in later authz work.
-- Gate 2: RLS lives in git migrations, not dashboard-only edits.

alter table identity.customer_profiles enable row level security;
alter table identity.user_roles enable row level security;
alter table catalog.destinations enable row level security;
alter table catalog.pois enable row level security;
alter table packages.packages enable row level security;
alter table pricing.price_records enable row level security;
alter table ops.audit_events enable row level security;

-- Public/authenticated read of published catalog (TD-04 may tighten guest access later)
drop policy if exists destinations_read_published on catalog.destinations;
create policy destinations_read_published on catalog.destinations
  for select
  using (publish_status = 'published' and verification_status = 'verified');

drop policy if exists pois_read_published on catalog.pois;
create policy pois_read_published on catalog.pois
  for select
  using (publish_status = 'published' and verification_status = 'verified');

drop policy if exists packages_read_published on packages.packages;
create policy packages_read_published on packages.packages
  for select
  using (publish_status = 'published');

-- Profiles: owner read/update (auth.uid when Supabase Auth is linked)
drop policy if exists profiles_owner_select on identity.customer_profiles;
create policy profiles_owner_select on identity.customer_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists profiles_owner_update on identity.customer_profiles;
create policy profiles_owner_update on identity.customer_profiles
  for update
  using (auth.uid() = user_id);

-- Audit: deny by default for authenticated; service role bypasses RLS
drop policy if exists audit_deny_all on ops.audit_events;
create policy audit_deny_all on ops.audit_events
  for all
  using (false)
  with check (false);
