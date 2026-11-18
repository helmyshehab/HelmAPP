-- Helm حلم — Step 5: travel catalog & destination management foundation
-- Additive only. Extends Step 4 places/destinations/geo/pricing. Never destroys data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Lifecycle (authoritative publication state)
-- ---------------------------------------------------------------------------
do $$ begin
  create type catalog.lifecycle_status as enum (
    'draft',
    'pending_verification',
    'verified',
    'approved',
    'published',
    'rejected',
    'archived'
  );
exception when duplicate_object then null;
end $$;

-- Expand place categories carefully (food/drink bars + beach clubs)
do $$ begin
  alter type catalog.place_category add value if not exists 'bar';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type catalog.place_category add value if not exists 'beach_club';
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Destinations: lifecycle + hierarchy + contact fields
-- ---------------------------------------------------------------------------
alter table catalog.destinations
  add column if not exists parent_id uuid references catalog.destinations(id),
  add column if not exists lifecycle_status catalog.lifecycle_status,
  add column if not exists short_description_en text,
  add column if not exists short_description_ar text,
  add column if not exists address_text text,
  add column if not exists website_url text,
  add column if not exists verified_by uuid references identity.user_accounts(id),
  add column if not exists verified_at timestamptz,
  add column if not exists approved_by uuid references identity.user_accounts(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references identity.user_accounts(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists archived_at timestamptz;

-- Backfill lifecycle from legacy dual columns (do not invent verification)
update catalog.destinations
set lifecycle_status = case
  when publish_status = 'archived' then 'archived'::catalog.lifecycle_status
  when publish_status = 'published' and verification_status = 'verified'
    then 'published'::catalog.lifecycle_status
  when verification_status = 'rejected' then 'rejected'::catalog.lifecycle_status
  when verification_status = 'pending' then 'pending_verification'::catalog.lifecycle_status
  when verification_status = 'verified' and publish_status = 'unpublished'
    then 'verified'::catalog.lifecycle_status
  when verification_status = 'draft' then 'draft'::catalog.lifecycle_status
  else 'draft'::catalog.lifecycle_status
end
where lifecycle_status is null;

alter table catalog.destinations
  alter column lifecycle_status set default 'draft'::catalog.lifecycle_status;

alter table catalog.destinations
  alter column lifecycle_status set not null;

create index if not exists idx_destinations_lifecycle
  on catalog.destinations (lifecycle_status);
create index if not exists idx_destinations_parent
  on catalog.destinations (parent_id);

-- ---------------------------------------------------------------------------
-- Places: expand fields + lifecycle (reuse existing place model)
-- ---------------------------------------------------------------------------
alter table catalog.places
  add column if not exists subcategory text not null default 'general',
  add column if not exists short_description_en text,
  add column if not exists short_description_ar text,
  add column if not exists address_text text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists website_url text,
  add column if not exists price_level smallint
    check (price_level is null or (price_level >= 1 and price_level <= 4)),
  add column if not exists is_featured boolean not null default false,
  add column if not exists rating_scale numeric(4, 1) default 5.0,
  add column if not exists review_count integer
    check (review_count is null or review_count >= 0),
  add column if not exists lifecycle_status catalog.lifecycle_status,
  add column if not exists verified_by uuid references identity.user_accounts(id),
  add column if not exists verified_at timestamptz,
  add column if not exists approved_by uuid references identity.user_accounts(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references identity.user_accounts(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists archived_at timestamptz,
  add column if not exists external_key text;

update catalog.places
set lifecycle_status = case
  when publish_status = 'archived' then 'archived'::catalog.lifecycle_status
  when publish_status = 'published' and verification_status = 'verified'
    then 'published'::catalog.lifecycle_status
  when verification_status = 'rejected' then 'rejected'::catalog.lifecycle_status
  when verification_status = 'pending' then 'pending_verification'::catalog.lifecycle_status
  when verification_status = 'verified' and publish_status = 'unpublished'
    then 'verified'::catalog.lifecycle_status
  when verification_status = 'draft' then 'draft'::catalog.lifecycle_status
  else 'draft'::catalog.lifecycle_status
end
where lifecycle_status is null;

alter table catalog.places
  alter column lifecycle_status set default 'draft'::catalog.lifecycle_status;

alter table catalog.places
  alter column lifecycle_status set not null;

-- Unique external key for deterministic imports (nullable; unique when set)
create unique index if not exists uq_places_external_key
  on catalog.places (external_key)
  where external_key is not null;

create index if not exists idx_places_lifecycle on catalog.places (lifecycle_status);
create index if not exists idx_places_subcategory on catalog.places (category, subcategory);
create index if not exists idx_places_featured on catalog.places (is_featured)
  where is_featured = true;
create index if not exists idx_places_name_en_trgm on catalog.places
  using btree (lower(name_en));

-- Keep legacy dual columns synchronized from lifecycle (Step 4 RLS / seed compatible)
create or replace function catalog.sync_legacy_publish_from_lifecycle()
returns trigger
language plpgsql
set search_path = catalog, pg_temp
as $$
begin
  if new.lifecycle_status = 'published' then
    new.publish_status := 'published';
    new.verification_status := 'verified';
    if new.published_at is null then
      new.published_at := now();
    end if;
  elsif new.lifecycle_status = 'archived' then
    new.publish_status := 'archived';
  elsif new.lifecycle_status = 'rejected' then
    new.publish_status := 'unpublished';
    new.verification_status := 'rejected';
  elsif new.lifecycle_status = 'pending_verification' then
    new.publish_status := 'unpublished';
    new.verification_status := 'pending';
  elsif new.lifecycle_status in ('verified', 'approved') then
    new.publish_status := 'unpublished';
    new.verification_status := 'verified';
  else
    new.publish_status := 'unpublished';
    new.verification_status := 'draft';
  end if;
  return new;
end;
$$;

drop trigger if exists places_sync_legacy_lifecycle on catalog.places;
create trigger places_sync_legacy_lifecycle
  before insert or update of lifecycle_status on catalog.places
  for each row execute function catalog.sync_legacy_publish_from_lifecycle();

drop trigger if exists destinations_sync_legacy_lifecycle on catalog.destinations;
create trigger destinations_sync_legacy_lifecycle
  before insert or update of lifecycle_status on catalog.destinations
  for each row execute function catalog.sync_legacy_publish_from_lifecycle();

-- ---------------------------------------------------------------------------
-- Category-specific detail tables (avoid one enormous nullable places table)
-- ---------------------------------------------------------------------------
create table if not exists catalog.place_accommodation_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  accommodation_type text not null default 'hotel'
    check (accommodation_type in (
      'hotel', 'resort', 'villa', 'apartment', 'guesthouse', 'boutique_hotel'
    )),
  star_rating smallint check (star_rating is null or (star_rating >= 1 and star_rating <= 5)),
  star_rating_verified boolean not null default false,
  amenities jsonb not null default '[]'::jsonb,
  room_features jsonb not null default '[]'::jsonb,
  check_in_time time,
  check_out_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_dining_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  cuisine_types text[] not null default '{}',
  meal_types text[] not null default '{}',
  dietary_options text[] not null default '{}',
  opening_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_attraction_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  attraction_type text not null default 'landmark'
    check (attraction_type in (
      'landmark', 'museum', 'cultural', 'natural', 'viewpoint', 'other'
    )),
  typical_duration_minutes integer check (typical_duration_minutes is null or typical_duration_minutes > 0),
  booking_required boolean,
  suitable_for text[] not null default '{}',
  seasonal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_activity_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  activity_type text not null default 'tour'
    check (activity_type in (
      'adventure', 'water_sports', 'tour', 'outdoor', 'wellness', 'other'
    )),
  typical_duration_minutes integer check (typical_duration_minutes is null or typical_duration_minutes > 0),
  booking_required boolean,
  suitable_for text[] not null default '{}',
  seasonal_availability text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_nightlife_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  venue_type text not null default 'nightclub'
    check (venue_type in (
      'nightclub', 'music_venue', 'festival_venue', 'bar_nightlife', 'other'
    )),
  music_genres text[] not null default '{}',
  age_restriction integer check (age_restriction is null or age_restriction >= 0),
  age_restriction_verified boolean not null default false,
  event_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_transport_details (
  place_id uuid primary key references catalog.places(id) on delete cascade,
  transport_type text not null default 'local'
    check (transport_type in (
      'airport_transfer', 'car_rental', 'local', 'intercity', 'other'
    )),
  service_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists place_accommodation_set_updated_at on catalog.place_accommodation_details;
create trigger place_accommodation_set_updated_at
  before update on catalog.place_accommodation_details
  for each row execute function ops.set_updated_at();

drop trigger if exists place_dining_set_updated_at on catalog.place_dining_details;
create trigger place_dining_set_updated_at
  before update on catalog.place_dining_details
  for each row execute function ops.set_updated_at();

drop trigger if exists place_attraction_set_updated_at on catalog.place_attraction_details;
create trigger place_attraction_set_updated_at
  before update on catalog.place_attraction_details
  for each row execute function ops.set_updated_at();

drop trigger if exists place_activity_set_updated_at on catalog.place_activity_details;
create trigger place_activity_set_updated_at
  before update on catalog.place_activity_details
  for each row execute function ops.set_updated_at();

drop trigger if exists place_nightlife_set_updated_at on catalog.place_nightlife_details;
create trigger place_nightlife_set_updated_at
  before update on catalog.place_nightlife_details
  for each row execute function ops.set_updated_at();

drop trigger if exists place_transport_set_updated_at on catalog.place_transport_details;
create trigger place_transport_set_updated_at
  before update on catalog.place_transport_details
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tags (structured; destinations keep legacy text[] tags too)
-- ---------------------------------------------------------------------------
create table if not exists catalog.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  category catalog.place_category,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.place_tags (
  place_id uuid not null references catalog.places(id) on delete cascade,
  tag_id uuid not null references catalog.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, tag_id)
);

create table if not exists catalog.destination_tags (
  destination_id uuid not null references catalog.destinations(id) on delete cascade,
  tag_id uuid not null references catalog.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (destination_id, tag_id)
);

drop trigger if exists tags_set_updated_at on catalog.tags;
create trigger tags_set_updated_at
  before update on catalog.tags
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Provenance / sources (reusable; multiple sources per entity)
-- ---------------------------------------------------------------------------
do $$ begin
  create type catalog.source_type as enum (
    'official_website',
    'hotel_website',
    'booking_platform',
    'maps_listing',
    'manual_research',
    'direct_confirmation',
    'partner_feed',
    'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists catalog.sources (
  id uuid primary key default gen_random_uuid(),
  source_type catalog.source_type not null,
  name text not null,
  url text,
  reference_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.entity_sources (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('destination', 'place', 'poi', 'media', 'rating', 'price')),
  entity_id uuid not null,
  source_id uuid not null references catalog.sources(id) on delete restrict,
  collected_at date,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected', 'stale')),
  verified_at timestamptz,
  verified_by uuid references identity.user_accounts(id),
  confidence smallint check (confidence is null or (confidence >= 0 and confidence <= 100)),
  notes text,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, source_id)
);

create index if not exists idx_entity_sources_entity
  on catalog.entity_sources (entity_type, entity_id);

drop trigger if exists sources_set_updated_at on catalog.sources;
create trigger sources_set_updated_at
  before update on catalog.sources
  for each row execute function ops.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ratings (never mix platforms without origin)
-- ---------------------------------------------------------------------------
create table if not exists catalog.place_ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references catalog.places(id) on delete cascade,
  rating_value numeric(4, 2) not null,
  rating_scale numeric(4, 1) not null default 5.0,
  review_count integer check (review_count is null or review_count >= 0),
  platform text not null,
  source_id uuid references catalog.sources(id),
  observed_at date not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (place_id, platform, observed_at)
);

create index if not exists idx_place_ratings_place on catalog.place_ratings (place_id);

-- ---------------------------------------------------------------------------
-- Media (storage paths only — never store binaries in Postgres)
-- ---------------------------------------------------------------------------
create table if not exists catalog.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  byte_size integer check (byte_size is null or byte_size >= 0),
  alt_text_en text,
  alt_text_ar text,
  attribution text,
  source_url text,
  source_id uuid references catalog.sources(id),
  is_public boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table if not exists catalog.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references catalog.places(id) on delete cascade,
  media_id uuid not null references catalog.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (place_id, media_id)
);

create table if not exists catalog.destination_media (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references catalog.destinations(id) on delete cascade,
  media_id uuid not null references catalog.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (destination_id, media_id)
);

create index if not exists idx_place_media_place on catalog.place_media (place_id, sort_order);
create index if not exists idx_destination_media_dest on catalog.destination_media (destination_id, sort_order);

drop trigger if exists media_assets_set_updated_at on catalog.media_assets;
create trigger media_assets_set_updated_at
  before update on catalog.media_assets
  for each row execute function ops.set_updated_at();

-- At most one active cover image per place
create unique index if not exists uq_place_media_cover
  on catalog.place_media (place_id)
  where is_cover = true and is_active = true;

create unique index if not exists uq_destination_media_cover
  on catalog.destination_media (destination_id)
  where is_cover = true and is_active = true;

-- ---------------------------------------------------------------------------
-- Import runs (auditable curated JSON imports; no external pipeline)
-- ---------------------------------------------------------------------------
create table if not exists catalog.import_runs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references identity.user_accounts(id),
  dry_run boolean not null default true,
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'partial')),
  source_label text,
  summary jsonb not null default '{}'::jsonb,
  error_report jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lifecycle transition helper (application remains primary enforcer)
-- ---------------------------------------------------------------------------
create or replace function catalog.assert_lifecycle_transition(
  from_status catalog.lifecycle_status,
  to_status catalog.lifecycle_status
) returns boolean
language plpgsql
immutable
set search_path = catalog, pg_temp
as $$
begin
  if from_status = to_status then
    return true;
  end if;
  if from_status = 'draft' and to_status in ('pending_verification', 'archived', 'rejected') then
    return true;
  end if;
  if from_status = 'pending_verification' and to_status in ('verified', 'rejected', 'draft') then
    return true;
  end if;
  if from_status = 'verified' and to_status in ('approved', 'rejected', 'pending_verification') then
    return true;
  end if;
  if from_status = 'approved' and to_status in ('published', 'rejected', 'archived') then
    return true;
  end if;
  if from_status = 'published' and to_status in ('archived') then
    return true;
  end if;
  if from_status = 'rejected' and to_status in ('draft', 'pending_verification', 'archived') then
    return true;
  end if;
  if from_status = 'archived' and to_status in ('draft') then
    return true;
  end if;
  return false;
end;
$$;

revoke all on function catalog.assert_lifecycle_transition(catalog.lifecycle_status, catalog.lifecycle_status) from public;
grant execute on function catalog.assert_lifecycle_transition(catalog.lifecycle_status, catalog.lifecycle_status) to public;

create or replace function catalog.enforce_lifecycle_transition()
returns trigger
language plpgsql
set search_path = catalog, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.lifecycle_status is distinct from new.lifecycle_status
     and not catalog.assert_lifecycle_transition(old.lifecycle_status, new.lifecycle_status) then
    raise exception 'invalid lifecycle transition: % → %', old.lifecycle_status, new.lifecycle_status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists places_enforce_lifecycle on catalog.places;
create trigger places_enforce_lifecycle
  before update of lifecycle_status on catalog.places
  for each row execute function catalog.enforce_lifecycle_transition();

drop trigger if exists destinations_enforce_lifecycle on catalog.destinations;
create trigger destinations_enforce_lifecycle
  before update of lifecycle_status on catalog.destinations
  for each row execute function catalog.enforce_lifecycle_transition();

-- Creating a record must never auto-verify/publish
create or replace function catalog.enforce_create_lifecycle()
returns trigger
language plpgsql
set search_path = catalog, pg_temp
as $$
begin
  if new.lifecycle_status in ('verified', 'approved', 'published') then
    raise exception 'cannot create entry directly as % — start as draft', new.lifecycle_status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists places_enforce_create_lifecycle on catalog.places;
create trigger places_enforce_create_lifecycle
  before insert on catalog.places
  for each row execute function catalog.enforce_create_lifecycle();

drop trigger if exists destinations_enforce_create_lifecycle on catalog.destinations;
create trigger destinations_enforce_create_lifecycle
  before insert on catalog.destinations
  for each row execute function catalog.enforce_create_lifecycle();

-- Grants for new tables (default privileges from Step 4 cover future; be explicit)
grant select, insert, update, delete on all tables in schema catalog to helm_authenticated;
grant select on all tables in schema catalog to helm_anon;
grant usage, select on all sequences in schema catalog to helm_authenticated;
