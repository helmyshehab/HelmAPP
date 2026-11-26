-- Catalog destination covers: public object bucket for intentional catalog photographs.
-- Backend (service role) is the only writer. Anon/authenticated clients have no write policies.
-- IMPORTANT: Public object URLs are world-readable. Postgres RLS does NOT protect them.
-- Only upload media that is intentionally public. Do not store private/staff-only files here.
--
-- Requires real Supabase Storage. Do not create stub storage.* tables.
-- Plain Postgres CI/Compose: apply-migrations.sh with MIGRATION_MODE=plain-postgres
-- skips this file when storage.buckets/objects are absent.

do $$
begin
  if to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception
      'catalog-media migration requires Supabase Storage (storage.buckets and storage.objects). '
      'Do not stub these tables. Apply on Supabase (hosted or supabase start / db reset), '
      'or use MIGRATION_MODE=plain-postgres so apply-migrations.sh can SKIP this file explicitly.';
  end if;
end $$;

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
