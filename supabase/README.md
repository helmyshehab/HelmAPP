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

```bash
# Plain Postgres (CI / Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres SEED=true ./scripts/apply-migrations.sh

# RLS harness (uses helm_authenticated + JWT claim.sub)
DATABASE_URL=... ./scripts/test-rls.sh

# Or Supabase CLI
supabase start
supabase db reset
```

**Note:** SQL migrations remain authoritative. Drizzle mirrors selected tables for NestJS access — do not invent schema only in TypeScript.
