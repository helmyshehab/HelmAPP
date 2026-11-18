#!/usr/bin/env bash
# Apply migrations+seed (if needed) and run Step 4 RLS harness as helm_authenticated.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"

echo "Ensuring migrations + seed on $DATABASE_URL"
SEED=true DATABASE_URL="$DATABASE_URL" "$ROOT/scripts/apply-migrations.sh" >/tmp/helm-migrate-rls.log

echo "Running RLS harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
begin;
set local role helm_authenticated;
\i $ROOT/supabase/tests/rls_step4.sql
rollback;
SQL

echo "Running revocation harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_revocation.sql"

echo "RLS tests passed."
