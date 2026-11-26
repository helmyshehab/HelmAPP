#!/usr/bin/env bash
# Apply version-controlled Supabase SQL migrations (+ optional seed) to DATABASE_URL.
# Gate 2 reproducibility helper for local Postgres Compose fallback and CI.
#
# MIGRATION_MODE:
#   supabase (default) — fail closed; SUPABASE_ONLY migrations require Storage schema
#   plain-postgres     — may explicitly SKIP listed SUPABASE_ONLY migrations when
#                        storage.buckets / storage.objects are absent
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SEED="${SEED:-false}"
MIGRATION_MODE="${MIGRATION_MODE:-supabase}"
MANIFEST="$ROOT/supabase/migrations/SUPABASE_ONLY"

case "$MIGRATION_MODE" in
  plain-postgres|supabase) ;;
  *)
    echo "error: invalid MIGRATION_MODE='$MIGRATION_MODE' (expected plain-postgres|supabase)" >&2
    exit 1
    ;;
esac

echo "Applying migrations (MIGRATION_MODE=$MIGRATION_MODE)"

# Validate SUPABASE_ONLY manifest entries (portable: no associative arrays).
SUPABASE_ONLY_COUNT=0
if [[ -f "$MANIFEST" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    entry="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -z "$entry" || "$entry" == \#* ]] && continue
    # Basename only: *.sql, no path separators, no hidden names.
    if [[ "$entry" == */* || "$entry" == .* || "$entry" != *.sql ]]; then
      echo "error: invalid SUPABASE_ONLY manifest entry: $entry" >&2
      exit 1
    fi
    if [[ ! -f "$ROOT/supabase/migrations/$entry" ]]; then
      echo "error: SUPABASE_ONLY entry missing on disk: $entry" >&2
      exit 1
    fi
    SUPABASE_ONLY_COUNT=$((SUPABASE_ONLY_COUNT + 1))
  done < "$MANIFEST"
fi

is_supabase_only() {
  local base="$1"
  [[ -f "$MANIFEST" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    entry="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -z "$entry" || "$entry" == \#* ]] && continue
    if [[ "$entry" == "$base" ]]; then
      return 0
    fi
  done < "$MANIFEST"
  return 1
}

has_storage_schema() {
  local result
  result="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
    "select case when to_regclass('storage.buckets') is not null
                  and to_regclass('storage.objects') is not null
             then 'yes' else 'no' end")"
  [[ "$result" == "yes" ]]
}

STORAGE_PRESENT=0
if has_storage_schema; then
  STORAGE_PRESENT=1
fi

if [[ "$MIGRATION_MODE" == "supabase" && "$STORAGE_PRESENT" -eq 0 && "$SUPABASE_ONLY_COUNT" -gt 0 ]]; then
  echo "error: MIGRATION_MODE=supabase requires Supabase Storage (storage.buckets and storage.objects), but they are absent. Refusing to skip SUPABASE_ONLY migrations. Use MIGRATION_MODE=plain-postgres for CI/Compose plain Postgres." >&2
  exit 1
fi

shopt -s nullglob
migrations=("$ROOT"/supabase/migrations/*.sql)
if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "error: no migration files found under supabase/migrations" >&2
  exit 1
fi

# Lexicographic order matches filename timestamps.
# shellcheck disable=SC2207
migrations_sorted=($(printf '%s\n' "${migrations[@]}" | LC_ALL=C sort))

for f in "${migrations_sorted[@]}"; do
  base="$(basename "$f")"
  if is_supabase_only "$base"; then
    if [[ "$STORAGE_PRESENT" -eq 1 ]]; then
      echo "→ $f"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
    else
      # Only reachable in plain-postgres mode (supabase mode already failed closed).
      echo "SKIP supabase-only migration: $base (storage schema absent; MIGRATION_MODE=plain-postgres)"
    fi
    continue
  fi
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

if [[ "$SEED" == "true" ]]; then
  echo "→ seed.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"
fi

echo "Done."
