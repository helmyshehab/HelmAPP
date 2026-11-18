-- Helm حلم — initial schema stubs (Step 2)
-- Gate 2: all DB artifacts version-controlled. Expand in later phases.
-- Authoritative structure for local + CI apply via Supabase CLI / psql.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Stub Supabase auth helpers for plain Postgres / local apply without full Auth.
create schema if not exists auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema if not exists identity;
create schema if not exists catalog;
create schema if not exists verification;
create schema if not exists pricing;
create schema if not exists packages;
create schema if not exists commerce;
create schema if not exists fulfillment;
create schema if not exists ai;
create schema if not exists ops;

do $$ begin
  create type identity.app_role as enum (
    'operator',
    'administrator',
    'super-administrator'
  );
exception when duplicate_object then null;
end $$;

create table if not exists identity.user_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_provider_ref text,
  primary_email citext,
  primary_phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists identity.customer_profiles (
  user_id uuid primary key references identity.user_accounts(id) on delete cascade,
  display_name text,
  home_country_code char(2) default 'EG',
  preferred_locale text default 'ar',
  preferred_currency char(3) default 'EGP',
  preferences_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists identity.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.user_accounts(id) on delete cascade,
  role identity.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid null
);

create table if not exists catalog.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  summary_en text,
  summary_ar text,
  country_code char(2) not null,
  verification_status text not null default 'draft',
  publish_status text not null default 'unpublished',
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists catalog.pois (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references catalog.destinations(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_ar text not null,
  category text,
  verification_status text not null default 'draft',
  publish_status text not null default 'unpublished',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (destination_id, slug)
);

create table if not exists packages.packages (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references catalog.destinations(id),
  slug text not null unique,
  title_en text not null,
  title_ar text not null,
  duration_days int not null default 5,
  publish_status text not null default 'unpublished',
  market_code text not null default 'EG_OUTBOUND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing.price_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  amount numeric(12,2) not null,
  currency char(3) not null default 'EGP',
  amount_egp numeric(12,2),
  source text not null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists ops.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);
