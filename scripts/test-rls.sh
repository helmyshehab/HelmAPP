#!/usr/bin/env bash
# Apply migrations+seed (if needed) and run Step 4 RLS harness as helm_authenticated.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
MIGRATION_MODE="${MIGRATION_MODE:-plain-postgres}"

echo "Ensuring migrations + seed (MIGRATION_MODE=$MIGRATION_MODE)"
SEED=true DATABASE_URL="$DATABASE_URL" MIGRATION_MODE="$MIGRATION_MODE" \
  "$ROOT/scripts/apply-migrations.sh" >/tmp/helm-migrate-rls.log

echo "Running RLS harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
begin;
-- Local Supabase: non-superuser postgres needs membership to SET ROLE.
-- Kept inside the transaction so rollback leaves membership unchanged.
grant helm_authenticated to current_user;
set local role helm_authenticated;
\i $ROOT/supabase/tests/rls_step4.sql
\i $ROOT/supabase/tests/rls_step5.sql
rollback;
SQL

echo "Running revocation harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_revocation.sql"

echo "Running trip drafts ownership harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_trip_drafts.sql"

echo "Running trip itinerary ownership harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_trip_itinerary.sql"

echo "RLS tests passed."
