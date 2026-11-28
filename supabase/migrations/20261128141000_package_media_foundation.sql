-- Package cover join table (plain Postgres + Supabase).
-- Storage bucket/policies stay in SUPABASE_ONLY 20261128140000_package_cover_storage.sql.
-- Idempotent: staging may already have this table from the original combined
-- 20261128140000_package_cover_storage.sql apply.
create table if not exists packages.package_media (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages.packages(id) on delete cascade,
  media_id uuid not null references catalog.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (package_id, media_id)
);

create index if not exists idx_package_media_package on packages.package_media (package_id, sort_order);

create unique index if not exists uq_package_media_cover
  on packages.package_media (package_id)
  where is_cover = true and is_active = true;

alter table packages.package_media enable row level security;
alter table packages.package_media force row level security;

drop policy if exists package_media_read on packages.package_media;
create policy package_media_read on packages.package_media
  for select
  using (
    exists (
      select 1 from packages.packages p
      where p.id = package_id
        and (
          p.publish_status = 'published'
          or identity.has_any_role(array['operator','administrator','super-administrator']::identity.app_role[])
        )
    )
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

drop policy if exists package_media_write_admin on packages.package_media;
create policy package_media_write_admin on packages.package_media
  for all
  using (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]))
  with check (identity.has_any_role(array['administrator','super-administrator']::identity.app_role[]));
