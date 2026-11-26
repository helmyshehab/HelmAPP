# Helm حلم — `helm-platform`

Monorepo for **Helm حلم** (GitHub: `helmyshehab/HelmAPP`). Egypt-outbound travel MVP foundation: Flutter mobile, Next.js web + admin, NestJS modular monolith, OpenAPI `/v1`, Supabase Auth/Postgres/Storage.

> **Platform foundation in progress.** Steps 2–4 are on `main`. Step 5 adds travel catalog lifecycle, discovery APIs, admin curation/import, media/provenance, and RLS. No booking/AI/payments product features yet.

## Layout

```
apps/
  helm_mobile/          Flutter shell (five empty tabs)
  helm-web/             Next.js customer shell
  helm-admin/           Next.js admin shell
services/
  helm-backend/         NestJS modular monolith (health/meta only)
packages/
  openapi/              OpenAPI 3 SoT (/v1)
  api-client-ts/        Generated TS client — DO NOT EDIT
  api-client-dart/      Generated Dart client — DO NOT EDIT
supabase/               Versioned migrations, RLS, seed, config
docker/                 Local Postgres Compose fallback
docs/                   LOCAL_DEVELOPMENT, CATALOG_IMPORT, DEPENDENCIES_AND_COSTS
```

## Three gates (enforced)

1. **Generated API clients** — regenerate from `packages/openapi` only; never hand-edit; CI fails on dirty regen.  
2. **Database artifacts in git** — migrations, RLS, config, seed under `supabase/`; reproducible apply path.  
3. **Local MVP without paid APIs** — seed data + mock payment/AI/flight/notify adapters.

## Setup

See [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

```bash
cp .env.example .env
pnpm install
pnpm codegen
# supabase start && supabase db reset
# or: MIGRATION_MODE=plain-postgres SEED=true ./scripts/apply-migrations.sh
pnpm --filter @helm/helm-backend dev
```

## Dependencies & costs

Every tool/dependency/version and free-vs-paid notes: [`docs/DEPENDENCIES_AND_COSTS.md`](docs/DEPENDENCIES_AND_COSTS.md).

**No paid services without Helmy approval.** Defaults: `AI_PROVIDER=mock`, `PAYMENT_PROVIDER=mock`, `FLIGHT_PROVIDER=mock`, `NOTIFY_PROVIDER=console`.

## Tooling (TD-02)

**pnpm** workspaces + **Turborepo** (free).

## Approved stack

NestJS + TypeScript modular monolith · Drizzle + ports/adapters · Flutter + Next.js · OpenAPI SoT + generated Dart/TS clients · Supabase Auth/Postgres/Storage · Docker + Supabase CLI local.
