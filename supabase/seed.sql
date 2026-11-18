-- Helm حلم — deterministic local seed (Gate 3 + Step 4 foundation)
-- Idempotent (ON CONFLICT). Demo/local only. Never invent verified ratings/prices.

-- Currencies
insert into pricing.currencies (code, name_en, name_ar, minor_units)
values
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 2),
  ('USD', 'US Dollar', 'دولار أمريكي', 2),
  ('EUR', 'Euro', 'يورو', 2),
  ('TRY', 'Turkish Lira', 'ليرة تركية', 2),
  ('GEL', 'Georgian Lari', 'لاري جورجي', 2)
on conflict (code) do nothing;

-- Markets: Egypt outbound first (not hardcoded into every table)
insert into markets.markets (
  code, display_name_en, display_name_ar, country_code,
  default_currency, default_language, supported_languages, direction, is_active
) values (
  'EG_OUTBOUND',
  'Egypt Outbound',
  'مصر — سفر خارجي',
  'EG',
  'EGP',
  'ar',
  array['ar','en'],
  'outbound',
  true
) on conflict (code) do nothing;

-- Geography
insert into geo.countries (code, name_en, name_ar, default_currency)
values
  ('EG', 'Egypt', 'مصر', 'EGP'),
  ('TR', 'Türkiye', 'تركيا', 'TRY'),
  ('GE', 'Georgia', 'جورجيا', 'GEL')
on conflict (code) do nothing;

insert into geo.cities (id, country_code, slug, name_en, name_ar, timezone, latitude, longitude)
values
  (
    'c1111111-1111-1111-1111-111111111111',
    'TR', 'istanbul', 'Istanbul', 'إسطنبول',
    'Europe/Istanbul', 41.008200, 28.978400
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'GE', 'tbilisi', 'Tbilisi', 'تبليسي',
    'Asia/Tbilisi', 41.715100, 44.827100
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'EG', 'cairo', 'Cairo', 'القاهرة',
    'Africa/Cairo', 30.044400, 31.235700
  )
on conflict (country_code, slug) do nothing;

-- Demo destinations (preserved from Step 2)
insert into catalog.destinations (
  id, slug, name_en, name_ar, summary_en, summary_ar, country_code,
  city_id, timezone, latitude, longitude,
  verification_status, publish_status, tags, published_at, is_featured
) values (
  '11111111-1111-1111-1111-111111111111',
  'istanbul',
  'Istanbul',
  'إسطنبول',
  'Bosphorus views, historic quarters, and vibrant food streets — a top Egypt outbound city break.',
  'إطلالات البوسفور وأحياء تاريخية وأكلات مميزة — وجهة مفضلة للمسافر المصري.',
  'TR',
  'c1111111-1111-1111-1111-111111111111',
  'Europe/Istanbul',
  41.008200,
  28.978400,
  'verified',
  'published',
  array['culture','food','city'],
  now(),
  true
) on conflict (slug) do update set
  city_id = excluded.city_id,
  timezone = excluded.timezone,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_featured = excluded.is_featured;

insert into catalog.destinations (
  id, slug, name_en, name_ar, summary_en, summary_ar, country_code,
  city_id, timezone, latitude, longitude,
  verification_status, publish_status, tags, published_at
) values (
  '22222222-2222-2222-2222-222222222222',
  'tbilisi',
  'Tbilisi',
  'تبليسي',
  'Wine cellars, sulfur baths, and walkable old town — rising favorite from Cairo.',
  'أقبية النبيذ وحمامات كبريتية ومدينة قديمة للمشي — وجهة صاعدة من القاهرة.',
  'GE',
  'c2222222-2222-2222-2222-222222222222',
  'Asia/Tbilisi',
  41.715100,
  44.827100,
  'verified',
  'published',
  array['culture','food','value'],
  now()
) on conflict (slug) do update set
  city_id = excluded.city_id,
  timezone = excluded.timezone,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

-- Unpublished draft destination (must NOT be visible to customers via RLS)
insert into catalog.destinations (
  id, slug, name_en, name_ar, country_code,
  verification_status, publish_status
) values (
  '99999999-9999-9999-9999-999999999999',
  'draft-future-destination',
  'Draft Future Destination',
  'وجهة مسودة',
  'TR',
  'draft',
  'unpublished'
) on conflict (slug) do nothing;

insert into markets.market_destinations (market_code, destination_id, is_featured, is_active)
values
  ('EG_OUTBOUND', '11111111-1111-1111-1111-111111111111', true, true),
  ('EG_OUTBOUND', '22222222-2222-2222-2222-222222222222', false, true)
on conflict (market_code, destination_id) do nothing;

insert into catalog.pois (id, destination_id, slug, name_en, name_ar, category, verification_status, publish_status)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    'sultanahmet',
    'Sultanahmet Historic Core',
    'قلب السلطان أحمد التاريخي',
    'neighborhood',
    'verified',
    'published'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    'kadikoy-food',
    'Kadıköy Food Walk',
    'جولة طعام في كاديكوي',
    'food',
    'verified',
    'published'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '22222222-2222-2222-2222-222222222222',
    'old-town',
    'Old Town & Narikala views',
    'البلدة القديمة ومناظر ناريكالا',
    'neighborhood',
    'verified',
    'published'
  )
on conflict (id) do nothing;

-- Catalog places foundation (no invented ratings)
insert into catalog.places (
  id, destination_id, city_id, category, slug, name_en, name_ar,
  description_en, verification_status, publish_status, published_at
) values (
  'a1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'attraction',
  'hagia-sophia-exterior',
  'Hagia Sophia (exterior context)',
  'آيا صوفيا (سياق خارجي)',
  'Structural landmark reference for catalog foundation — not a live ticket product.',
  'verified',
  'published',
  now()
) on conflict (destination_id, category, slug) do nothing;

insert into packages.packages (
  id, destination_id, slug, title_en, title_ar, duration_days, publish_status, market_code
) values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'istanbul-5d-private-stay',
  'Istanbul 5 Nights — Flights + Private Stay',
  'إسطنبول ٥ ليالٍ — طيران وإقامة خاصة',
  5,
  'published',
  'EG_OUTBOUND'
) on conflict (slug) do nothing;

-- Manually curated price with provenance (not a live FX feed)
insert into pricing.price_records (
  id, subject_type, subject_id,
  amount, currency, amount_egp,
  original_amount, original_currency,
  display_amount, display_currency,
  source, source_ref, observed_at,
  verification_status, last_verified_at, notes
) values (
  '44444444-4444-4444-4444-444444444444',
  'package',
  '33333333-3333-3333-3333-333333333333',
  45999.00,
  'EGP',
  45999.00,
  45999.00,
  'EGP',
  45999.00,
  'EGP',
  'ops_quote',
  'local-demo-seed',
  now(),
  'manual_verified',
  now(),
  'Deterministic demo quote for local MVP — not a live market price.'
) on conflict (id) do nothing;

-- Demo customer (local; Auth link lands with BD-12)
insert into identity.user_accounts (id, auth_provider_ref, primary_email, status)
values (
  '55555555-5555-5555-5555-555555555555',
  'local-demo-customer',
  'demo.customer@helm.local',
  'active'
) on conflict (id) do nothing;

insert into identity.customer_profiles (
  user_id, first_name, last_name, display_name,
  home_country_code, country_of_residence, nationality_code,
  preferred_locale, preferred_currency, preferences_json
) values (
  '55555555-5555-5555-5555-555555555555',
  'Demo',
  'Traveler',
  'Demo Traveler',
  'EG',
  'EG',
  'EG',
  'ar',
  'EGP',
  '{"lifestyle_tags":["food","culture"],"budget_band_egp":{"min":30000,"max":60000}}'::jsonb
) on conflict (user_id) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  country_of_residence = excluded.country_of_residence,
  nationality_code = excluded.nationality_code;

insert into identity.user_roles (user_id, role, granted_by)
select '55555555-5555-5555-5555-555555555555', 'customer'::identity.app_role, null
where not exists (
  select 1 from identity.user_roles
  where user_id = '55555555-5555-5555-5555-555555555555'
    and role = 'customer'
    and revoked_at is null
);

-- Demo staff users for RLS harness (local only)
insert into identity.user_accounts (id, auth_provider_ref, primary_email, status)
values
  ('66666666-6666-6666-6666-666666666666', 'local-demo-operator', 'demo.operator@helm.local', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'local-demo-admin', 'demo.admin@helm.local', 'active'),
  ('88888888-8888-8888-8888-888888888888', 'local-demo-super', 'demo.super@helm.local', 'active')
on conflict (id) do nothing;

insert into identity.user_roles (user_id, role, granted_by)
select v.user_id, v.role::identity.app_role, v.granted_by
from (values
  ('66666666-6666-6666-6666-666666666666'::uuid, 'operator', '88888888-8888-8888-8888-888888888888'::uuid),
  ('77777777-7777-7777-7777-777777777777'::uuid, 'administrator', '88888888-8888-8888-8888-888888888888'::uuid),
  ('88888888-8888-8888-8888-888888888888'::uuid, 'super-administrator', null::uuid)
) as v(user_id, role, granted_by)
where not exists (
  select 1 from identity.user_roles ur
  where ur.user_id = v.user_id and ur.role = v.role::identity.app_role and ur.revoked_at is null
);
