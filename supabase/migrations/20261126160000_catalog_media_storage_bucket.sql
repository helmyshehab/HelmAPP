-- Catalog destination covers: public object bucket for intentional catalog photographs.
-- Backend (service role) is the only writer. Anon/authenticated clients have no write policies.
-- IMPORTANT: Public object URLs are world-readable. Postgres RLS does NOT protect them.
-- Only upload media that is intentionally public. Do not store private/staff-only files here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  5242880, -- 5 MiB (matches app-level cover limit)
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for catalog photographs (bucket is intentionally public).
drop policy if exists catalog_media_public_read on storage.objects;
create policy catalog_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'catalog-media');

-- No insert / update / delete policies for anon or authenticated.
-- Service role bypasses RLS and performs all writes via the Helm backend StoragePort.
drop policy if exists catalog_media_client_insert on storage.objects;
drop policy if exists catalog_media_client_update on storage.objects;
drop policy if exists catalog_media_client_delete on storage.objects;
