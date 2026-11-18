# supabase/

Version-controlled Supabase project for **Helm حلم** (Gate 2).

| Path | Purpose |
|------|---------|
| `config.toml` | Local Supabase CLI config |
| `migrations/` | Schema, RLS, triggers, functions |
| `seed.sql` | Realistic demo seed (Gate 3) |

## Apply locally

```bash
# From repo root (Docker required)
supabase start
supabase db reset   # applies migrations + seed.sql
```

## CI

Workflows assert migration files exist and (when Docker is available) apply them to ephemeral Postgres.
