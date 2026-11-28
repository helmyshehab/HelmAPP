-- Deploy signed destination cover support before privatizing this existing bucket.
-- Existing object names and catalog references stay in place.
update storage.buckets
set public = false
where id = 'catalog-media';

drop policy if exists catalog_media_public_read on storage.objects;
drop policy if exists catalog_destination_covers_backend_only on storage.objects;
create policy catalog_destination_covers_backend_only
  on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'catalog-media')
  with check (bucket_id <> 'catalog-media');
