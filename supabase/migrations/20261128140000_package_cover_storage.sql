-- Private package cover bucket + Storage RLS (Supabase Storage required).
-- packages.package_media lives in 20261128141000_package_media_foundation.sql
-- so plain-postgres CI gets the table while this file remains SUPABASE_ONLY.
-- Staging may already have package_media from an earlier combined form of this
-- migration; the foundation file uses IF NOT EXISTS for that upgrade path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-package-covers',
  'catalog-package-covers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists catalog_package_covers_backend_only on storage.objects;
create policy catalog_package_covers_backend_only
  on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'catalog-package-covers')
  with check (bucket_id <> 'catalog-package-covers');
