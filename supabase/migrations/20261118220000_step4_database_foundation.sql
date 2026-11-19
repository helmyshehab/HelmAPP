-- Helm حلم — Step 4: database & identity foundation
-- Additive only: expands Step 2 stubs. SQL migrations remain authoritative.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists geo;
create schema if not exists markets;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function ops.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auth helpers for plain Postgres / Supabase-compatible JWT claim settings.
-- Preserve Supabase Auth's auth.uid()/auth.role() when present; only create
-- claim-based fallbacks when missing (plain Postgres Compose path).
create schema if not exists auth;

do $$
begin
  if to_regprocedure('auth.uid()') is null then
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  end if;

  if to_regprocedure('auth.role()') is null then
    create function auth.role()
    returns text
    language sql
    stable
    as $fn$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
    $fn$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Reference: currencies
-- ---------------------------------------------------------------------------
create table if not exists pricing.currencies (
  code char(3) primary key,
  name_en text not null,
  name_ar text,
  minor_units smallint not null default 2 check (minor_units >= 0 and minor_units <= 4),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Markets (Egypt outbound first; extensible)
-- ---------------------------------------------------------------------------
create table if not exists markets.markets (
  code text primary key,
  display_name_en text not null,
  display_name_ar text,
  country_code char(2) not null,
  default_currency char(3) not null references pricing.currencies(code),
  default_language text not null,
  supported_languages text[] not null default '{}',
  direction text not null check (direction in ('outbound', 'inbound', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists markets_set_updated_at on markets.markets;
create trigger markets_set_updated_at
  before update on markets.markets
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Geography (reusable; not duplicated per market)
-- ---------------------------------------------------------------------------
create table if not exists geo.countries (
  code char(2) primary key,
  name_en text not null,
  name_ar text,
  default_currency char(3) references pricing.currencies(code),
  phone_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists geo.regions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references geo.countries(code),
  code text,
  name_en text not null,
  name_ar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, code)
);

create table if not exists geo.cities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references geo.countries(code),
  region_id uuid references geo.regions(id),
  slug text not null,
  name_en text not null,
  name_ar text,
  timezone text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, slug)
);

create table if not exists geo.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references geo.cities(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_ar text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index if not exists idx_geo_cities_country on geo.cities (country_code);
create index if not exists idx_geo_areas_city on geo.areas (city_id);

drop trigger if exists countries_set_updated_at on geo.countries;
create trigger countries_set_updated_at
  before update on geo.countries
  for each row execute function ops.set_updated_at();

drop trigger if exists regions_set_updated_at on geo.regions;
create trigger regions_set_updated_at
  before update on geo.regions
  for each row execute function ops.set_updated_at();

drop trigger if exists cities_set_updated_at on geo.cities;
create trigger cities_set_updated_at
  before update on geo.cities
  for each row execute function ops.set_updated_at();

drop trigger if exists areas_set_updated_at on geo.areas;
create trigger areas_set_updated_at
  before update on geo.areas
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Identity expansions (no passwords / no travel documents)
-- ---------------------------------------------------------------------------
-- Add customer to role enum (staff roles remain privileged; customer may be explicit)
do $$ begin
  alter type identity.app_role add value if not exists 'customer';
exception
  when duplicate_object then null;
end $$;

alter table identity.user_accounts
  add column if not exists status_reason text,
  add column if not exists last_seen_at timestamptz;

alter table identity.user_accounts
  drop constraint if exists user_accounts_status_check;
alter table identity.user_accounts
  add constraint user_accounts_status_check
  check (status in ('active', 'disabled', 'pending', 'deleted'));

create unique index if not exists idx_user_accounts_primary_email
  on identity.user_accounts (primary_email)
  where primary_email is not null;

alter table identity.customer_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists photo_storage_path text,
  add column if not exists phone_e164 text,
  add column if not exists nationality_code char(2),
  add column if not exists country_of_residence char(2);

-- Prefer explicit residence column; keep home_country_code for Step 2 compatibility
comment on column identity.customer_profiles.home_country_code is
  'Legacy Step 2 field; prefer country_of_residence going forward.';

-- Role grants: uniqueness, grant metadata, FK on granted_by
alter table identity.user_roles
  add column if not exists revoked_at timestamptz,
  add column if not exists revoke_reason text;

do $$ begin
  alter table identity.user_roles
    add constraint user_roles_granted_by_fkey
    foreign key (granted_by) references identity.user_accounts(id);
exception when duplicate_object then null;
end $$;

create unique index if not exists idx_user_roles_active_unique
  on identity.user_roles (user_id, role)
  where revoked_at is null;

create index if not exists idx_user_roles_user on identity.user_roles (user_id);

-- Staff role check for RLS (customer is implicit for authenticated users)
create or replace function identity.has_role(required identity.app_role)
returns boolean
language sql
stable
security definer
set search_path = identity, auth, pg_temp
as $$
  select exists (
    select 1
    from identity.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = required
      and ur.revoked_at is null
  );
$$;

create or replace function identity.has_any_role(required identity.app_role[])
returns boolean
language sql
stable
security definer
set search_path = identity, auth, pg_temp
as $$
  select exists (
    select 1
    from identity.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any (required)
      and ur.revoked_at is null
  );
$$;

-- RLS helpers are callable by authenticated DB roles; keep PUBLIC for Supabase `authenticated`/`anon`.
revoke all on function identity.has_role(identity.app_role) from public;
revoke all on function identity.has_any_role(identity.app_role[]) from public;
grant execute on function identity.has_role(identity.app_role) to public;
grant execute on function identity.has_any_role(identity.app_role[]) to public;


drop trigger if exists user_accounts_set_updated_at on identity.user_accounts;
create trigger user_accounts_set_updated_at
  before update on identity.user_accounts
  for each row execute function ops.set_updated_at();

drop trigger if exists customer_profiles_set_updated_at on identity.customer_profiles;
create trigger customer_profiles_set_updated_at
  before update on identity.customer_profiles
  for each row execute function ops.set_updated_at();

-- Role assignment audit helper (fail-closed privilege path uses this from service role)
create or replace function identity.assign_role(
  p_user_id uuid,
  p_role identity.app_role,
  p_granted_by uuid
) returns uuid
language plpgsql
security definer
set search_path = identity, ops, auth, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_role = 'customer'::identity.app_role then
    -- customers may self-bootstrap customer role only for themselves
    if auth.uid() is distinct from p_user_id and not identity.has_any_role(
      array['administrator','super-administrator']::identity.app_role[]
    ) then
      raise exception 'not authorized to assign customer role';
    end if;
  else
    -- privileged roles: super-administrator only
    if not identity.has_role('super-administrator'::identity.app_role) then
      raise exception 'not authorized to assign privileged role';
    end if;
  end if;

  insert into identity.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, p_granted_by)
  returning id into v_id;

  insert into ops.audit_events (actor_user_id, action, entity_type, entity_id, after_json)
  values (
    p_granted_by,
    'role.assign',
    'identity.user_roles',
    v_id,
    jsonb_build_object('user_id', p_user_id, 'role', p_role::text)
  );

  return v_id;
end;
$$;

-- assign_role is SECURITY DEFINER: do NOT grant to PUBLIC.
-- Callable by table owner / service role and explicitly by helm_authenticated for tested paths.
revoke all on function identity.assign_role(uuid, identity.app_role, uuid) from public;
do $$ begin
  grant execute on function identity.assign_role(uuid, identity.app_role, uuid) to helm_authenticated;
exception when undefined_object then
  -- role created later in this migration; grant applied after role exists
  null;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog: destinations expansion + places foundation
-- ---------------------------------------------------------------------------
alter table catalog.destinations
  add column if not exists city_id uuid references geo.cities(id),
  add column if not exists timezone text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists media_refs jsonb not null default '[]'::jsonb,
  add column if not exists is_featured boolean not null default false,
  add column if not exists description_en text,
  add column if not exists description_ar text;

create index if not exists idx_destinations_country on catalog.destinations (country_code);
create index if not exists idx_destinations_publish on catalog.destinations (publish_status, verification_status);

drop trigger if exists destinations_set_updated_at on catalog.destinations;
create trigger destinations_set_updated_at
  before update on catalog.destinations
  for each row execute function ops.set_updated_at();

drop trigger if exists pois_set_updated_at on catalog.pois;
create trigger pois_set_updated_at
  before update on catalog.pois
  for each row execute function ops.set_updated_at();

do $$ begin
  create type catalog.place_category as enum (
    'accommodation',
    'restaurant',
    'cafe',
    'attraction',
    'activity',
    'nightlife',
    'transport'
  );
exception when duplicate_object then null;
end $$;

create table if not exists catalog.places (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references catalog.destinations(id) on delete cascade,
  city_id uuid references geo.cities(id),
  area_id uuid references geo.areas(id),
  category catalog.place_category not null,
  slug text not null,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  media_refs jsonb not null default '[]'::jsonb,
  -- Ratings only when a real source exists — never invent
  rating_value numeric(3, 2),
  rating_source text,
  rating_observed_at timestamptz,
  verification_status text not null default 'draft'
    check (verification_status in ('draft', 'pending', 'verified', 'rejected')),
  publish_status text not null default 'unpublished'
    check (publish_status in ('unpublished', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (destination_id, category, slug),
  check (
    (rating_value is null and rating_source is null)
    or (rating_value is not null and rating_source is not null)
  )
);

create index if not exists idx_places_destination on catalog.places (destination_id);
create index if not exists idx_places_category on catalog.places (category);
create index if not exists idx_places_publish on catalog.places (publish_status, verification_status);

drop trigger if exists places_set_updated_at on catalog.places;
create trigger places_set_updated_at
  before update on catalog.places
  for each row execute function ops.set_updated_at();

-- Market ↔ destination availability (many markets can feature same destination)
create table if not exists markets.market_destinations (
  market_code text not null references markets.markets(code) on delete cascade,
  destination_id uuid not null references catalog.destinations(id) on delete cascade,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (market_code, destination_id)
);

-- ---------------------------------------------------------------------------
-- Pricing provenance expansion (keep legacy columns)
-- ---------------------------------------------------------------------------
alter table pricing.price_records
  add column if not exists original_amount numeric(12, 2),
  add column if not exists original_currency char(3) references pricing.currencies(code),
  add column if not exists display_amount numeric(12, 2),
  add column if not exists display_currency char(3) references pricing.currencies(code),
  add column if not exists fx_rate numeric(18, 8),
  add column if not exists fx_source text,
  add column if not exists fx_observed_at timestamptz,
  add column if not exists source_ref text,
  add column if not exists source_url text,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists notes text;

alter table pricing.price_records
  drop constraint if exists price_records_verification_status_check;
alter table pricing.price_records
  add constraint price_records_verification_status_check
  check (verification_status in ('unverified', 'manual_verified', 'stale', 'rejected'));

-- Backfill provenance from legacy amount/currency where missing
update pricing.price_records
set
  original_amount = coalesce(original_amount, amount),
  original_currency = coalesce(original_currency, currency),
  display_amount = coalesce(display_amount, amount_egp, amount),
  display_currency = coalesce(display_currency, case when amount_egp is not null then 'EGP' else currency end)
where original_amount is null or original_currency is null;

create index if not exists idx_price_records_subject
  on pricing.price_records (subject_type, subject_id);

create index if not exists idx_price_records_observed
  on pricing.price_records (observed_at desc);

-- ---------------------------------------------------------------------------
-- Test/app roles for RLS (non-bypass) — used by CI RLS harness
-- ---------------------------------------------------------------------------
do $$ begin
  create role helm_authenticated nologin nosuperuser nobypassrls;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role helm_anon nologin nosuperuser nobypassrls;
exception when duplicate_object then null;
end $$;

grant usage on schema identity, catalog, pricing, packages, ops, geo, markets, verification, commerce, fulfillment, ai
  to helm_authenticated, helm_anon;

-- auth schema/functions may be owned by Supabase Auth — skip grants we cannot make.
do $$
begin
  grant usage on schema auth to helm_authenticated, helm_anon;
exception
  when insufficient_privilege then null;
  when undefined_object then null;
end $$;

do $$
begin
  grant execute on function auth.uid() to helm_authenticated, helm_anon;
  grant execute on function auth.role() to helm_authenticated, helm_anon;
exception
  when insufficient_privilege then null;
  when undefined_function then null;
end $$;

grant execute on function identity.has_role(identity.app_role) to helm_authenticated, helm_anon;
grant execute on function identity.has_any_role(identity.app_role[]) to helm_authenticated, helm_anon;
grant execute on function identity.assign_role(uuid, identity.app_role, uuid) to helm_authenticated;

grant select, insert, update, delete on all tables in schema identity, catalog, pricing, packages, ops, geo, markets
  to helm_authenticated;
grant select on all tables in schema catalog, pricing, packages, geo, markets to helm_anon;
grant usage, select on all sequences in schema identity, catalog, pricing, packages, ops, geo, markets
  to helm_authenticated;

alter default privileges in schema identity, catalog, pricing, packages, ops, geo, markets
  grant select, insert, update, delete on tables to helm_authenticated;
alter default privileges in schema catalog, pricing, packages, geo, markets
  grant select on tables to helm_anon;

