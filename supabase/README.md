# supabase/

Version-controlled Supabase / PostgreSQL project for **Helm حلم** (Gate 2 + Steps 4–5).

| Path | Purpose |
|------|---------|
| `config.toml` | Local Supabase CLI config |
| `migrations/` | Schema, RLS, triggers, functions (authoritative) |
| `seed.sql` | Deterministic local demo seed |
| `tests/rls_step4.sql` | RLS harness for customer/admin contexts |
| `tests/rls_step5.sql` | Catalog lifecycle, provenance, media RLS harness |

## Schemas (Steps 4–5)

| Schema | Responsibility |
|--------|----------------|
| `identity` | Accounts, profiles, DB-managed roles |
| `geo` | Countries, regions, cities, areas |
| `markets` | Market configs (e.g. `EG_OUTBOUND`) + destination links |
| `catalog` | Destinations, places + lifecycle, category details, tags, media refs, sources, import runs |
| `pricing` | Currencies + provenance-aware price records (reused for place prices) |
| `packages` / `commerce` / `fulfillment` / `ai` / `ops` / `verification` | Existing stubs / audit |

## Apply locally

`scripts/apply-migrations.sh` modes (`MIGRATION_MODE`):

| Mode | Default | Behavior |
|------|---------|----------|
| `supabase` | **yes** | Fail closed if `storage.buckets` / `storage.objects` are missing while `SUPABASE_ONLY` lists migrations |
| `plain-postgres` | no | Explicitly `SKIP supabase-only migration: …` when Storage is absent; never creates stub `storage.*` tables |

`supabase/migrations/SUPABASE_ONLY` lists basenames that require real Supabase Storage (today: catalog-media bucket).

```bash
# Plain Postgres (CI / Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
  MIGRATION_MODE=plain-postgres SEED=true ./scripts/apply-migrations.sh

# RLS / integrity harnesses default to plain-postgres
DATABASE_URL=... ./scripts/test-rls.sh
DATABASE_URL=... ./scripts/test-db-integrity.sh

# Supabase (hosted or local CLI) — Storage required
DATABASE_URL=... MIGRATION_MODE=supabase SEED=true ./scripts/apply-migrations.sh

# Or Supabase CLI (applies all migrations including Storage)
supabase start
supabase db reset
```

Scripts do **not** print `DATABASE_URL` (avoids leaking credentials in logs).

**Note:** SQL migrations remain authoritative. Drizzle mirrors selected tables for NestJS access — do not invent schema only in TypeScript. Do not stub `storage.*` on plain Postgres.
