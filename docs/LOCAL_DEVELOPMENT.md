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
supabase db reset          # migrations + seed.sql

# Option B — plain Postgres fallback
docker compose -f docker/docker-compose.yml up -d postgres
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres SEED=true ./scripts/apply-migrations.sh

# API (AUTH_PROVIDER=mock by default)
pnpm --filter @helm/helm-backend dev
# Public:  http://127.0.0.1:8080/v1/health | /v1/ready | /v1/meta
# Authed:  http://127.0.0.1:8080/v1/me  (Bearer mock JWT from tests / MockAuthAdapter)

# Web / admin
pnpm --filter helm-web dev             # :3000
pnpm --filter helm-admin dev           # :3001

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

Apply with `supabase db reset` or `scripts/apply-migrations.sh`.

## Step 2 scope reminder

Skeleton only: health/meta API, empty app shells, mocks, seed. **No product features.**
