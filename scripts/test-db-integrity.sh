#!/usr/bin/env bash
# Apply migrations (+ seed) and run Step 6.3 database integrity SQL harness.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
MIGRATION_MODE="${MIGRATION_MODE:-plain-postgres}"

echo "Ensuring migrations + seed (MIGRATION_MODE=$MIGRATION_MODE)"
SEED=true DATABASE_URL="$DATABASE_URL" MIGRATION_MODE="$MIGRATION_MODE" \
  "$ROOT/scripts/apply-migrations.sh" >/tmp/helm-migrate-integrity.log

echo "Running Step 6.3 integrity harness"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/step6_3_integrity.sql"

echo "DB integrity tests passed."
