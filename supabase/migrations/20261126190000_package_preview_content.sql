-- Versioned Build-compatible package content (ubud_trip_preview v1 JSON).
-- Legacy rows (e.g. Istanbul) keep null content and stay out of the public Packages API.

alter table packages.packages
  add column if not exists summary_en text,
  add column if not exists summary_ar text,
  add column if not exists content jsonb;

comment on column packages.packages.content is
  'Optional ubud_trip_preview v1 JSON. Required and validated on publish for traveler Customize in Build.';
