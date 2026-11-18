-- Helm حلم — realistic demo seed for local MVP (Gate 3)
-- Safe for local/dev only. No paid external calls.

-- Demo destination: Istanbul (EG outbound interest)
insert into catalog.destinations (
  id, slug, name_en, name_ar, summary_en, summary_ar, country_code,
  verification_status, publish_status, tags, published_at
) values (
  '11111111-1111-1111-1111-111111111111',
  'istanbul',
  'Istanbul',
  'إسطنبول',
  'Bosphorus views, historic quarters, and vibrant food streets — a top Egypt outbound city break.',
  'إطلالات البوسفور وأحياء تاريخية وأكلات مميزة — وجهة مفضلة للمسافر المصري.',
  'TR',
  'verified',
  'published',
  array['culture','food','city'],
  now()
) on conflict (slug) do nothing;

insert into catalog.destinations (
  id, slug, name_en, name_ar, summary_en, summary_ar, country_code,
  verification_status, publish_status, tags, published_at
) values (
  '22222222-2222-2222-2222-222222222222',
  'tbilisi',
  'Tbilisi',
  'تبليسي',
  'Wine cellars, sulfur baths, and walkable old town — rising favorite from Cairo.',
  'أقبية النبيذ وحمامات كبريتية ومدينة قديمة للمشي — وجهة صاعدة من القاهرة.',
  'GE',
  'verified',
  'published',
  array['culture','food','value'],
  now()
) on conflict (slug) do nothing;

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

insert into pricing.price_records (id, subject_type, subject_id, amount, currency, amount_egp, source, observed_at)
values (
  '44444444-4444-4444-4444-444444444444',
  'package',
  '33333333-3333-3333-3333-333333333333',
  45999.00,
  'EGP',
  45999.00,
  'ops_quote',
  now()
) on conflict (id) do nothing;

-- Demo local user (not linked to real Auth until BD-12)
insert into identity.user_accounts (id, auth_provider_ref, primary_email, status)
values (
  '55555555-5555-5555-5555-555555555555',
  'local-demo-customer',
  'demo.customer@helm.local',
  'active'
) on conflict (id) do nothing;

insert into identity.customer_profiles (user_id, display_name, home_country_code, preferred_locale, preferred_currency, preferences_json)
values (
  '55555555-5555-5555-5555-555555555555',
  'Demo Traveler',
  'EG',
  'ar',
  'EGP',
  '{"lifestyle_tags":["food","culture"],"budget_band_egp":{"min":30000,"max":60000}}'::jsonb
) on conflict (user_id) do nothing;
