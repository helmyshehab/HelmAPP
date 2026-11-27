-- Private place images are signed by the backend after a staff or publication check.
-- Keep the existing public destination bucket and its policies unchanged.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-place-covers',
  'catalog-place-covers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists catalog_place_covers_backend_only on storage.objects;
create policy catalog_place_covers_backend_only
  on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'catalog-place-covers')
  with check (bucket_id <> 'catalog-place-covers');
