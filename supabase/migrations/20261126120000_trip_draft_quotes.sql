-- The backend writes demo quotes from a saved draft while holding its row lock.
-- Application clients read quotes through the owner-scoped HTTP API.
create table if not exists trips.trip_draft_quotes (
  draft_id uuid primary key references trips.trip_drafts(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  draft_updated_at timestamptz not null,
  price_json jsonb not null check (jsonb_typeof(price_json) = 'object'),
  created_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > created_at)
);

alter table trips.trip_draft_quotes enable row level security;
revoke all on trips.trip_draft_quotes from public, helm_authenticated;
