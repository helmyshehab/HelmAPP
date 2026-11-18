-- Helm حلم — Step 5 follow-up: destination external keys + tighter operator curation RLS
-- Additive only. Operators may not alter tags/provenance on approved/published entries.

alter table catalog.destinations
  add column if not exists external_key text,
  add column if not exists short_description_en text,
  add column if not exists short_description_ar text;

create unique index if not exists uq_destinations_external_key
  on catalog.destinations (external_key)
  where external_key is not null;

-- ---------- place_tags: admin full; operator only on curatable places ----------
drop policy if exists place_tags_write_staff on catalog.place_tags;
drop policy if exists place_tags_write_admin on catalog.place_tags;
drop policy if exists place_tags_operator_curate on catalog.place_tags;

create policy place_tags_write_admin on catalog.place_tags
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

create policy place_tags_operator_curate on catalog.place_tags
  for all
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
  );

-- ---------- destination_tags ----------
drop policy if exists destination_tags_write_staff on catalog.destination_tags;
drop policy if exists destination_tags_write_admin on catalog.destination_tags;
drop policy if exists destination_tags_operator_curate on catalog.destination_tags;

create policy destination_tags_write_admin on catalog.destination_tags
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

create policy destination_tags_operator_curate on catalog.destination_tags
  for all
  using (
    identity.has_role('operator'::identity.app_role)
    and exists (
      select 1 from catalog.destinations d
      where d.id = destination_id
        and d.lifecycle_status in ('draft', 'pending_verification', 'rejected')
    )
  )
  with check (
    identity.has_role('operator'::identity.app_role)
    and exists (
      select 1 from catalog.destinations d
      where d.id = destination_id
        and d.lifecycle_status in ('draft', 'pending_verification', 'rejected')
    )
  );

-- ---------- sources: staff read; staff insert; admin update/delete ----------
drop policy if exists sources_staff_all on catalog.sources;
drop policy if exists sources_select_staff on catalog.sources;
drop policy if exists sources_insert_staff on catalog.sources;
drop policy if exists sources_admin_mutate on catalog.sources;

create policy sources_select_staff on catalog.sources
  for select
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

create policy sources_insert_staff on catalog.sources
  for insert
  with check (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

create policy sources_admin_mutate on catalog.sources
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

-- ---------- entity_sources: admin full; operator only on curatable entities ----------
drop policy if exists entity_sources_staff_all on catalog.entity_sources;
drop policy if exists entity_sources_select_staff on catalog.entity_sources;
drop policy if exists entity_sources_write_admin on catalog.entity_sources;
drop policy if exists entity_sources_operator_curate on catalog.entity_sources;

create policy entity_sources_select_staff on catalog.entity_sources
  for select
  using (identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[]));

create policy entity_sources_write_admin on catalog.entity_sources
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));

create policy entity_sources_operator_curate on catalog.entity_sources
  for all
  using (
    identity.has_role('operator'::identity.app_role)
    and (
      (
        entity_type = 'place'
        and exists (
          select 1 from catalog.places p
          where p.id = entity_id
            and p.lifecycle_status in ('draft', 'pending_verification', 'rejected')
        )
      )
      or (
        entity_type = 'destination'
        and exists (
          select 1 from catalog.destinations d
          where d.id = entity_id
            and d.lifecycle_status in ('draft', 'pending_verification', 'rejected')
        )
      )
    )
  )
  with check (
    identity.has_role('operator'::identity.app_role)
    and (
      (
        entity_type = 'place'
        and exists (
          select 1 from catalog.places p
          where p.id = entity_id
            and p.lifecycle_status in ('draft', 'pending_verification', 'rejected')
        )
      )
      or (
        entity_type = 'destination'
        and exists (
          select 1 from catalog.destinations d
          where d.id = entity_id
            and d.lifecycle_status in ('draft', 'pending_verification', 'rejected')
        )
      )
    )
  );
