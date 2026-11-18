# helm-backend

NestJS **TypeScript modular monolith** for Helm حلم.

## Step 3 — Backend foundation

| Area | Status |
|------|--------|
| Global `/v1` prefix | Yes |
| Liveness `/v1/health` | Yes |
| Readiness `/v1/ready` | Yes (optional DB check) |
| Meta `/v1/meta` | Yes |
| `/v1/me` (auth required) | Yes — principal + roles only |
| Structured JSON logs | Yes |
| RFC 7807 problem+json errors | Yes |
| Zod request validation pipe | Yes |
| AuthPort + mock / Supabase JWT adapters | Yes — no Supabase SDK in domain |
| RBAC roles | `customer`, `operator`, `administrator`, `super-administrator` |
| Provider mocks | Payment / AI / Flight / Notify / Storage |
| Product booking/AI/payments | **Not implemented** (later phases) |

## Layout

```
src/
  common/           # logging, errors, auth guards, meta HTTP
  infrastructure/   # config, ports, adapters (mock + supabase JWT)
  modules/          # domain modules (identity foundation + empty stubs)
```

Domain / application code depends on **ports** only. Supabase-specific verification lives under `infrastructure/adapters/supabase/`.

## Local

```bash
cp ../../.env.example ../../.env
pnpm --filter @helm/helm-backend dev
# AUTH_PROVIDER=mock (default)
# Issue a test token via MockAuthAdapter in tests, or call /v1/health without auth
```

## Tests

```bash
pnpm --filter @helm/helm-backend test
pnpm --filter @helm/helm-backend typecheck
```
