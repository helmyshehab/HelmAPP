# Dependencies, installations, and costs — Helm حلم

**Rule:** No paid services, subscriptions, or paid dependencies without **Helmy Shehab** approval. Prefer free / MIT / Apache-2.0.

Recorded at Step 2 scaffold (2026-11-18). Versions are pinned in package manifests where applicable.

---

## 1. Toolchain (install on developer machines)

| Dependency | Version | License / cost | Approval |
|------------|---------|----------------|----------|
| Node.js | 22.x Active LTS (dev: 22.23.x) | Free (MIT-ish / OpenJS) | Not required |
| pnpm | 10.33.4 | Free (MIT) | Not required — **TD-02 accepted** |
| Turborepo (`turbo`) | 2.11.13 | Free (MIT) for open source use | Not required |
| TypeScript | 5.9.3 | Free (Apache-2.0) | Not required |
| Git | 2.x | Free | Not required |
| Docker Engine | 24+ | Free (Engine). Docker Desktop may need paid license for larger orgs — **TD-09** | Flag Desktop licensing |
| Supabase CLI | 2.x latest | Free | Not required |
| Flutter SDK | stable channel (3.24+) | Free (BSD-style) | Not required |
| Android Studio | latest stable | Free | Not required |
| Xcode | latest stable | Free w/ Apple ID; Mac hardware | Not required for Android-only |
| `psql` (PostgreSQL client) | 15+ | Free | Not required (migration apply helper) |

---

## 2. JavaScript / TypeScript workspace packages

### Root

| Package | Version | Cost | Notes |
|---------|---------|------|-------|
| turbo | 2.11.13 | Free | Monorepo task runner |
| typescript | 5.9.3 | Free | Shared |

### `services/helm-backend`

| Package | Version | Cost | Notes |
|---------|---------|------|-------|
| `@nestjs/common` | 11.2.11 | Free (MIT) | Modular monolith |
| `@nestjs/core` | 11.2.11 | Free (MIT) | |
| `@nestjs/platform-express` | 11.2.11 | Free (MIT) | |
| `drizzle-orm` | 0.45.4 | Free (Apache-2.0) | Ports/adapters persistence |
| `postgres` | 3.4.7 | Free (MIT) | Driver |
| `reflect-metadata` | 0.2.2 | Free | Nest DI |
| `rxjs` | 7.8.2 | Free (Apache-2.0) | Nest peer |
| `zod` | 3.25.76 | Free (MIT) | Env/validation |
| `jose` | 5.9.6 | Free (MIT) | JWT verify/sign for AuthPort (mock + Supabase JWT); no paid IdP |
| `tsx` | 4.20.5 | Free (MIT) | Dev runner |
| `@types/node` | 22.18.6 | Free | Dev |
| `@types/express` | 5.0.3 | Free | Dev |

### `packages/api-client-ts`

| Package | Version | Cost | Notes |
|---------|---------|------|-------|
| `openapi-typescript` | 7.13.0 | Free (MIT) | Codegen from OpenAPI SoT |

### `apps/helm-web` & `apps/helm-admin`

| Package | Version | Cost | Notes |
|---------|---------|------|-------|
| `next` | 15.5.29 | Free (MIT) | App Router |
| `react` | 19.1.1 | Free (MIT) | |
| `react-dom` | 19.1.1 | Free (MIT) | |
| `@types/react` | 19.1.13 | Free | Dev |
| `@types/react-dom` | 19.1.9 | Free | Dev |
| `@helm/api-client-ts` | workspace | Free | Generated — do not edit |

### `packages/openapi`

No runtime deps (YAML SoT only).

---

## 3. Dart / Flutter

| Package | Version | Cost | Notes |
|---------|---------|------|-------|
| Flutter SDK | stable | Free | `apps/helm_mobile` |
| `http` | 1.2.2 | Free (BSD) | Used by generated Dart client |
| `flutter_lints` / `lints` | 5.x | Free | Dev |
| `helm_api_client` | path | Free | Generated — do not edit |

---

## 4. Infrastructure images / services (local)

| Component | Version / image | Cost | Notes |
|-----------|-----------------|------|-------|
| PostgreSQL | `postgres:15.14` | Free | Compose fallback |
| Supabase local stack | via CLI | Free | Auth + DB + Storage |
| Mailhog | `mailhog/mailhog:v1.0.1` | Free | Optional notify profile |
| GitHub Actions | `ubuntu-latest` | Free tier | CI stubs only |

---

## 5. Ambiguous / future — **Helmy approval required before adopting**

| Item | Why flagged | Related |
|------|-------------|---------|
| Hosted Supabase beyond free tier | Paid after limits | TD-01 / ops |
| Production API hosting (Fly/Render/Railway/Vercel Pro, etc.) | Paid hosts | TD-01 |
| Paid AI APIs (OpenAI, Anthropic, …) | Usage fees | BD-09 |
| Payment providers (Paymob, Stripe, …) | Fees + contracts | BD-01 |
| SMS OTP providers | Per-message cost | BD-12 |
| Maps SDKs with billing | Prefer free deep-links | TBD |
| Sentry / paid error tracking | Subscription | TD-10 |
| Docker Desktop (org size) | May require paid plan | TD-09 |
| Apple Developer / Google Play accounts | Store release fees | Launch phase |
| CI minutes beyond GitHub free | Scale | Stay free |

**Ambiguous:** Vercel/Netlify free tiers for Next.js previews — OK for experiments if free-tier only; upgrading plans needs approval. Prefer documenting as optional and unconfigured at Step 2.

---

## 6. What Step 2 installs (when you run setup)

1. `pnpm install` — JS workspace deps listed above (all free/MIT/Apache).  
2. `supabase start` or Docker Postgres — local containers.  
3. `flutter pub get` — Flutter packages.  
4. No paid API keys required; `.env.example` defaults to mocks.

---

## 7. Cost posture summary

| Environment | Expected cost |
|-------------|---------------|
| Local MVP with mocks + seed | **$0** runtime APIs |
| CI (this repo workflows) | GitHub free tier |
| Staging/prod paid vendors | **Blocked** until Helmy approval |
