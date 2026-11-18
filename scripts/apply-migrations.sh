#!/usr/bin/env bash
# Apply version-controlled Supabase SQL migrations (+ optional seed) to DATABASE_URL.
# Gate 2 reproducibility helper for local Postgres Compose fallback and CI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SEED="${SEED:-false}"

echo "Applying migrations to $DATABASE_URL"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

if [[ "$SEED" == "true" ]]; then
  echo "→ seed.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"
fi

echo "Done."
