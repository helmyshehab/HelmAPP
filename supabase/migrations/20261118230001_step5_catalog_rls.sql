-- Helm حلم — Step 5: RLS for catalog lifecycle, media, provenance, tags, import
-- Customers: published read only. Operators: limited curation. Admins: manage.
-- Application validation remains required; RLS is defense in depth.

-- Force RLS on new tables
alter table catalog.place_accommodation_details enable row level security;
alter table catalog.place_accommodation_details force row level security;
alter table catalog.place_dining_details enable row level security;
alter table catalog.place_dining_details force row level security;
alter table catalog.place_attraction_details enable row level security;
alter table catalog.place_attraction_details force row level security;
alter table catalog.place_activity_details enable row level security;
alter table catalog.place_activity_details force row level security;
alter table catalog.place_nightlife_details enable row level security;
alter table catalog.place_nightlife_details force row level security;
alter table catalog.place_transport_details enable row level security;
alter table catalog.place_transport_details force row level security;

alter table catalog.tags enable row level security;
alter table catalog.tags force row level security;
alter table catalog.place_tags enable row level security;
alter table catalog.place_tags force row level security;
alter table catalog.destination_tags enable row level security;
alter table catalog.destination_tags force row level security;

alter table catalog.sources enable row level security;
alter table catalog.sources force row level security;
alter table catalog.entity_sources enable row level security;
alter table catalog.entity_sources force row level security;

alter table catalog.place_ratings enable row level security;
alter table catalog.place_ratings force row level security;

alter table catalog.media_assets enable row level security;
alter table catalog.media_assets force row level security;
alter table catalog.place_media enable row level security;
alter table catalog.place_media force row level security;
alter table catalog.destination_media enable row level security;
alter table catalog.destination_media force row level security;

alter table catalog.import_runs enable row level security;
alter table catalog.import_runs force row level security;

-- ---------- Destinations / places: prefer lifecycle_status ----------
drop policy if exists destinations_read_published on catalog.destinations;
create policy destinations_read_published on catalog.destinations
  for select
  using (
    lifecycle_status = 'published'
    or (publish_status = 'published' and verification_status = 'verified')
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists destinations_write_admin on catalog.destinations;
create policy destinations_write_admin on catalog.destinations
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- Operators may curate draft/pending/rejected destinations only (no publish)
drop policy if exists destinations_operator_insert on catalog.destinations;
create policy destinations_operator_insert on catalog.destinations
  for insert
  with check (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  );

drop policy if exists destinations_operator_update on catalog.destinations;
create policy destinations_operator_update on catalog.destinations
  for update
  using (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  )
  with check (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  );

drop policy if exists places_read_published on catalog.places;
create policy places_read_published on catalog.places
  for select
  using (
    lifecycle_status = 'published'
    or (publish_status = 'published' and verification_status = 'verified')
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists places_write_admin on catalog.places;
create policy places_write_admin on catalog.places
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists places_operator_insert on catalog.places;
create policy places_operator_insert on catalog.places
  for insert
  with check (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  );

drop policy if exists places_operator_update on catalog.places;
create policy places_operator_update on catalog.places
  for update
  using (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  )
  with check (
    identity.has_role('operator'::identity.app_role)
    and lifecycle_status in ('draft', 'pending_verification', 'rejected')
  );

-- ---------- Detail tables: visible when parent place is ----------
create or replace function catalog.place_is_readable(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = catalog, identity, pg_temp
as $$
  select exists (
    select 1 from catalog.places p
    where p.id = p_place_id
      and (
        p.lifecycle_status = 'published'
        or (p.publish_status = 'published' and p.verification_status = 'verified')
        or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
      )
  );
$$;

revoke all on function catalog.place_is_readable(uuid) from public;
grant execute on function catalog.place_is_readable(uuid) to public;

create or replace function catalog.destination_is_readable(p_destination_id uuid)
returns boolean
language sql
stable
security definer
set search_path = catalog, identity, pg_temp
as $$
  select exists (
    select 1 from catalog.destinations d
    where d.id = p_destination_id
      and (
        d.lifecycle_status = 'published'
        or (d.publish_status = 'published' and d.verification_status = 'verified')
        or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
      )
  );
$$;

revoke all on function catalog.destination_is_readable(uuid) from public;
grant execute on function catalog.destination_is_readable(uuid) to public;

-- Detail read/write policies (repeat pattern per table)
do $$
declare
  t text;
begin
  foreach t in array array[
    'place_accommodation_details',
    'place_dining_details',
    'place_attraction_details',
    'place_activity_details',
    'place_nightlife_details',
    'place_transport_details'
  ]
  loop
    execute format('drop policy if exists %I_read on catalog.%I', t, t);
    execute format(
      'create policy %I_read on catalog.%I for select using (catalog.place_is_readable(place_id))',
      t, t
    );
    execute format('drop policy if exists %I_admin on catalog.%I', t, t);
    execute format(
      $f$
      create policy %I_admin on catalog.%I for all
        using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
        with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
      $f$, t, t
    );
    execute format('drop policy if exists %I_operator on catalog.%I', t, t);
    execute format(
      $f$
      create policy %I_operator on catalog.%I for all
        using (
          identity.has_role('operator'::identity.app_role)
          and exists (
            select 1 from catalog.places p
            where p.id = place_id
              and p.lifecycle_status in ('draft', 'pending_verification', 'rejected')
          )
        )
        with check (
          identity.has_role('operator'::identity.app_role)
          and exists (
            select 1 from catalog.places p
            where p.id = place_id
              and p.lifecycle_status in ('draft', 'pending_verification', 'rejected')
          )
        )
      $f$, t, t
    );
  end loop;
end $$;

-- Tags: public read active; staff write
drop policy if exists tags_read_active on catalog.tags;
create policy tags_read_active on catalog.tags
  for select
  using (
    is_active = true
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists tags_write_admin on catalog.tags;
create policy tags_write_admin on catalog.tags
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists place_tags_read on catalog.place_tags;
create policy place_tags_read on catalog.place_tags
  for select
  using (catalog.place_is_readable(place_id));

drop policy if exists place_tags_write_staff on catalog.place_tags;
create policy place_tags_write_staff on catalog.place_tags
  for all
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

drop policy if exists destination_tags_read on catalog.destination_tags;
create policy destination_tags_read on catalog.destination_tags
  for select
  using (catalog.destination_is_readable(destination_id));

drop policy if exists destination_tags_write_staff on catalog.destination_tags;
create policy destination_tags_write_staff on catalog.destination_tags
  for all
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

-- Sources: staff-only (customers must not see private provenance notes)
drop policy if exists sources_staff_all on catalog.sources;
create policy sources_staff_all on catalog.sources
  for all
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

drop policy if exists entity_sources_staff_all on catalog.entity_sources;
create policy entity_sources_staff_all on catalog.entity_sources
  for all
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

-- Ratings: readable when place is published; staff write
drop policy if exists place_ratings_read on catalog.place_ratings;
create policy place_ratings_read on catalog.place_ratings
  for select
  using (catalog.place_is_readable(place_id));

drop policy if exists place_ratings_write_admin on catalog.place_ratings;
create policy place_ratings_write_admin on catalog.place_ratings
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- Media assets: public only when flagged public+active; unpublished stay private
drop policy if exists media_assets_read_public on catalog.media_assets;
create policy media_assets_read_public on catalog.media_assets
  for select
  using (
    (is_public = true and is_active = true)
    or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
  );

drop policy if exists media_assets_write_admin on catalog.media_assets;
create policy media_assets_write_admin on catalog.media_assets
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists place_media_read on catalog.place_media;
create policy place_media_read on catalog.place_media
  for select
  using (
    catalog.place_is_readable(place_id)
    and is_active = true
    and exists (
      select 1 from catalog.media_assets m
      where m.id = media_id
        and (
          (m.is_public = true and m.is_active = true)
          or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
        )
    )
  );

drop policy if exists place_media_write_admin on catalog.place_media;
create policy place_media_write_admin on catalog.place_media
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

drop policy if exists destination_media_read on catalog.destination_media;
create policy destination_media_read on catalog.destination_media
  for select
  using (
    catalog.destination_is_readable(destination_id)
    and is_active = true
    and exists (
      select 1 from catalog.media_assets m
      where m.id = media_id
        and (
          (m.is_public = true and m.is_active = true)
          or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
        )
    )
  );

drop policy if exists destination_media_write_admin on catalog.destination_media;
create policy destination_media_write_admin on catalog.destination_media
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- Import runs: admin read/write; operators may insert own dry-run/curate imports
drop policy if exists import_runs_select_staff on catalog.import_runs;
create policy import_runs_select_staff on catalog.import_runs
  for select
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

drop policy if exists import_runs_insert_staff on catalog.import_runs;
create policy import_runs_insert_staff on catalog.import_runs
  for insert
  with check (
    identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

drop policy if exists import_runs_admin_all on catalog.import_runs;
create policy import_runs_admin_all on catalog.import_runs
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- Pricing: allow published place price reads (extend Step 4 package-only rule)
drop policy if exists price_records_read_published_subject on pricing.price_records;
create policy price_records_read_published_subject on pricing.price_records
  for select
  using (
    identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
    or (
      subject_type = 'package'
      and exists (
        select 1 from packages.packages p
        where p.id = subject_id and p.publish_status = 'published'
      )
    )
    or (
      subject_type = 'place'
      and exists (
        select 1 from catalog.places pl
        where pl.id = subject_id and pl.lifecycle_status = 'published'
      )
    )
  );
