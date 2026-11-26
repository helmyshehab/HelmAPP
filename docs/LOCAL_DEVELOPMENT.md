# Local development — Helm حلم (`helm-platform`)

Full local MVP path uses **free** tooling only. Paid APIs stay mocked until Helmy Shehab approves them.

## Prerequisites

| Tool | Version (pinned / target) | Notes |
|------|---------------------------|-------|
| Node.js | **22.x** Active LTS | Required |
| pnpm | **10.33.4** | Via `packageManager` field |
| Docker Engine | 24+ | For Postgres / Supabase local |
| Supabase CLI | **2.x** latest stable | Preferred Auth/DB/Storage stack |
| Flutter SDK | **stable** (3.24+) | For `helm_mobile` |
| Git | 2.x | Required |

Optional: Android Studio / Xcode emulators; Mailhog (Compose profile `notify`).

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm codegen

# Option A — Supabase local (recommended)
supabase start
supabase db reset          # migrations + seed.sql (includes catalog-media Storage bucket)

# Option B — plain Postgres fallback (CI-compatible)
docker compose -f docker/docker-compose.yml up -d postgres
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  MIGRATION_MODE=plain-postgres SEED=true ./scripts/apply-migrations.sh
# Explicitly SKIPs supabase/migrations/SUPABASE_ONLY entries when Storage is absent.
# Default MIGRATION_MODE=supabase fails closed without storage.buckets/objects.

# API (AUTH_PROVIDER=mock by default — backend unit tests only)
pnpm --filter @helm/helm-backend dev
# Public:  http://127.0.0.1:8080/v1/health | /v1/ready | /v1/meta
# Authed:  http://127.0.0.1:8080/v1/me  (Bearer mock JWT from tests / MockAuthAdapter)

# Web / admin
pnpm --filter helm-web dev             # :3000
pnpm --filter helm-admin dev           # :3001

## helm-admin auth (Step 6.4)

Admin UI login uses **Supabase email/password + SSR cookies**. It does **not** use `AUTH_PROVIDER=mock`.

1. After `supabase db reset`, create Auth users pinned to seed account UUIDs:

```bash
DEMO_STAFF_PASSWORD='choose-a-local-only-password' \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/seed-local-staff-auth.mjs
```

2. Run the API with JWT verification against local Supabase:

```bash
AUTH_PROVIDER=supabase_jwt \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=... \
SUPABASE_JWT_SECRET=... \
pnpm --filter @helm/helm-backend dev
```

3. Open `http://127.0.0.1:3001/login` and sign in as `demo.operator@helm.local` / `demo.admin@helm.local` / `demo.super@helm.local` using `DEMO_STAFF_PASSWORD`.

Staff authorization still comes from `identity.user_roles` via `GET /v1/me` (`rolesSource=database`). Customer demo Auth users must not enter the staff shell.

# Mobile
cd apps/helm_mobile && flutter pub get && flutter run
```

## Provider defaults (Gate 3)

| Env var | Local default | Meaning |
|---------|---------------|---------|
| `AI_PROVIDER` | `mock` | Deterministic offline AI |
| `PAYMENT_PROVIDER` | `mock` | No real charges |
| `FLIGHT_PROVIDER` | `mock` | Static demo quotes |
| `NOTIFY_PROVIDER` | `console` | Logs only |

## Generated clients (Gate 1)

Edit `packages/openapi/openapi.yaml` only, then:

```bash
pnpm codegen
```

Never hand-edit `packages/api-client-ts/src/generated` or `packages/api-client-dart/lib/src/generated`.

## Database artifacts (Gate 2)

| Artifact | Path |
|----------|------|
| Config | `supabase/config.toml` |
| Migrations / RLS | `supabase/migrations/*.sql` |
| Seed | `supabase/seed.sql` |

Apply with `supabase db reset` (full Storage) or:

```bash
# Plain Postgres / CI
MIGRATION_MODE=plain-postgres SEED=true ./scripts/apply-migrations.sh

# Supabase DB URL (Storage required; fail closed)
MIGRATION_MODE=supabase SEED=true ./scripts/apply-migrations.sh
```

Opt-in real Storage REST check (not run in CI by default):

```bash
RUN_STORAGE_INTEGRATION=1 STORAGE_PROVIDER=supabase \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  pnpm --filter @helm/helm-backend exec node --import tsx --test \
  test/catalog-media-storage.integration.test.ts
```

## Step 2 scope reminder

Skeleton only: health/meta API, empty app shells, mocks, seed. **No product features.**
