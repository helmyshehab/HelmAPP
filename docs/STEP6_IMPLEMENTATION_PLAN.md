# Helm حلم — Step 6 Implementation Plan

**Document type:** Technical design / architecture audit  
**Status:** Draft for approval before Step 6.1 implementation  
**Base commit:** `19361d38919a4b12c519974cf4b248762c8edb3a` (`main`, Step 5 merge)  
**Branch for this design:** `cursor/step6-catalog-ops-design-3062`  
**Companion:** [`STEP6_CATALOG_OPERATIONS_SPEC.md`](./STEP6_CATALOG_OPERATIONS_SPEC.md)

---

## 1. Executive summary

Step 5 delivered catalog **data model**, **public discovery**, **place admin APIs**, **import writer**, and **RLS**. Destination **writes** today exist only via JSON import. `apps/helm-admin` is still a Step 2 skeleton (Next 15.5.29, no auth, no routes, unused API client).

Step 6 should **extend** Step 5 — not rewrite it — by:

1. Adding destination admin HTTP APIs (mirror place admin patterns).  
2. Adding staff geo lookup endpoints for country/city pickers.  
3. Adding audit history read API (admin+).  
4. Building `helm-admin` shell + Destinations + Import UI on generated clients.  
5. Wiring staff authentication (Supabase Auth → Bearer → existing PrincipalResolver).

**No production code or migrations are changed in Step 6.0** (this document only).

---

## 2. Current-state architecture audit

### 2.1 Database

#### Geography (`20261118220000_step4_database_foundation.sql`)

| Table | Role | Destination link |
|-------|------|------------------|
| `geo.countries` | Canonical countries | `destinations.country_code` (**no FK today**) |
| `geo.regions` | Optional regions | **No destination FK** |
| `geo.cities` | Cities + timezone/coords | `destinations.city_id` FK |
| `geo.areas` | Neighborhoods under cities | Places have `area_id`; destinations do not |

#### `catalog.destinations` (effective columns)

Identity: `id`, `slug` UNIQUE, `name_en/ar`, summaries, descriptions, short descriptions.  
Geo/packaging: `country_code`, `city_id`, `timezone`, `latitude`, `longitude`, `address_text`, `website_url`, `is_featured`.  
Hierarchy: `parent_id` → self.  
Legacy parallel fields: `tags text[]`, `media_refs jsonb`, `publish_status`, `verification_status` (synced from lifecycle).  
Lifecycle: `lifecycle_status` + verified/approved/rejected/archived actors & timestamps + `rejection_reason`.  
Import: `external_key` (partial unique, `20261118232000`).

Indexes: country, publish pair, lifecycle, parent, external_key.  
**Gaps:** no name search index; no composite list index `(lifecycle_status, updated_at)`; no FK from `country_code` → `geo.countries`; no cycle guard on `parent_id`.

#### Related tables (reuse)

- `catalog.tags`, `destination_tags`  
- `catalog.sources`, `entity_sources`  
- `catalog.media_assets`, `destination_media`  
- `catalog.import_runs`  
- `ops.audit_events` (`actor_user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `created_at`) — **no `(entity_type, entity_id)` index**

#### Lifecycle enforcement (DB)

Triggers on destinations: sync legacy statuses, enforce transition graph, block create-as-published. Same graph as places / `lifecycle.ts`.

#### RLS (destinations + related)

| Actor | Destinations | Destination tags / entity_sources | Destination media | Audit |
|-------|--------------|-----------------------------------|-------------------|-------|
| Customer | SELECT published only | via published parent / staff rules | public media only | no |
| Operator | INSERT/UPDATE when lifecycle ∈ draft\|pending\|rejected | same parent rule | **no write** (admin media) | INSERT only |
| Administrator | full | full | yes | SELECT + INSERT |

Geo: public read; admin write.

#### Seeds

3 countries, 3 cities; Istanbul + Tbilisi published destinations; one draft; no destination_tags/media/external_keys.

### 2.2 Backend

| Component | Path | Destination status |
|-----------|------|--------------------|
| `CatalogPublicController` | `.../catalog-public.controller.ts` | `GET /v1/destinations`, `GET /v1/destinations/:slug` |
| `CatalogAdminController` | `.../catalog-admin.controller.ts` | Places list/create/transition + import only — **no destination routes** |
| `CatalogQueryService` | public destination list/get | No staff destination service methods |
| `CatalogAdminService` | place create/transition/list + import | **No destination CRUD/transition** |
| `CatalogRepository` | `listDestinations`, `getDestinationBySlug` | No by-id, no mutations, staff filters limited |
| `CatalogImportWriter` | destination upsert + tags/sources | Production-ready for bulk path |
| `lifecycle.ts` | shared rules | Used by places; ready for destinations |
| `AuditService` | write-only `record()` | No history query API |
| Auth | JwtAuthGuard → PrincipalResolver → DB `identity.user_roles` → RolesGuard | Fail-closed for staff |

Drizzle `schema.ts` destinations mirror is **partial**; repository correctly uses raw SQL for full columns.

### 2.3 API / OpenAPI / clients

Public destination ops: `listDestinations`, `getDestination` + `DestinationPublic`.  
Admin ops today: `adminListCatalogPlaces`, `adminCreateCatalogPlace`, `adminTransitionCatalogPlace`, `adminImportCatalog`.  
**Missing OpenAPI:** destination admin CRUD/list/transition, geo staff lookups, audit history.  
Generated `@helm/api-client-ts` / Dart clients follow OpenAPI; `helm-admin` declares TS client but does not import it yet. Note: OpenAPI already documents `adminListCatalogPlaces`; keep codegen in sync after any contract change.

### 2.4 Frontend (`apps/helm-admin`)

| Item | Finding |
|------|---------|
| Next.js | **15.5.29**, React 19.1.1, App Router |
| Port | 3001 |
| Routes | `/` placeholder only |
| Auth | None (no Supabase SSR, no middleware) |
| Styling | Inline styles only; no Tailwind/design system package |
| API | `@helm/api-client-ts` linked + transpiled; **unused** |
| Verdict | **Skeleton** — no admin functionality |

`apps/helm-web` is a twin skeleton on port 3000.

### 2.5 What can be reused without rewrite

1. Lifecycle domain + SQL triggers  
2. Place admin controller/service patterns (copy shape for destinations)  
3. `listDestinations({ publicOnly })` foundation  
4. Import writer + `docs/CATALOG_IMPORT.md` + sample JSON  
5. Public mapper / leak scrubbing  
6. RolesGuard + PrincipalResolver + AuditService.write  
7. RLS policies for destinations (already operator-curatable)  
8. OpenAPI → codegen pipeline  
9. RLS test harness (`scripts/test-rls.sh`, `rls_step5.sql`)

### 2.6 Missing functionality (Destinations-first)

| Layer | Missing |
|-------|---------|
| DB (optional additive) | `country_code` FK; search/list indexes; audit entity index; optional parent cycle trigger |
| API | Staff destination list/get/create/update/transition; tag attach helpers; geo country/city list for pickers; audit history |
| Admin UI | Auth session, shell, destination screens, import UI |
| Tests | Destination admin authz/integration; admin UI smoke later |

---

## 3. Proposed database / API changes

### 3.1 Database (additive only — implement in 6.1+ after approval)

| Change | Priority | Rationale |
|--------|----------|-----------|
| Index `ops.audit_events (entity_type, entity_id, created_at DESC)` | High | Audit panel performance |
| Index destinations `(lifecycle_status, updated_at DESC)` and/or `lower(name_en)` | Medium | Staff list/search |
| FK `catalog.destinations.country_code → geo.countries(code)` | Medium | Integrity (validate existing data first) |
| Optional CHECK/trigger: `parent_id <> id` + depth/cycle function | Medium | Hierarchy safety |
| **Do not** recreate destinations or geo tables | — | — |
| **Defer** `region_id`/`area_id` on destinations unless product chooses D3 = add FKs | — | Prefer parent destination tree |

No RLS redesign required for core destination CRUD if APIs use the same role patterns; extend `rls_step5.sql` only if policies change.

### 3.2 Proposed endpoint contracts

All under `/v1`, OpenAPI first, then Nest + codegen.

#### Destinations admin

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/admin/catalog/destinations` | operator+ | Staff list: `q`, `lifecycleStatus`, `country`, `featured`, `parentId`, `limit`, `offset` |
| GET | `/v1/admin/catalog/destinations/{id}` | operator+ | Full staff destination (lifecycle, actors, tags, sources, media refs) |
| POST | `/v1/admin/catalog/destinations` | operator+ | Create draft (creatable statuses only) |
| PATCH | `/v1/admin/catalog/destinations/{id}` | operator+ / admin per RLS | Update fields; enforce curatable vs admin |
| POST | `/v1/admin/catalog/destinations/{id}/transition` | operator+ with admin-only targets | Same body as places: `{ to, rejectionReason? }` |
| PUT | `/v1/admin/catalog/destinations/{id}/tags` | operator+/admin per parent lifecycle | Replace or set tag slug list (decide replace vs additive — **recommend explicit replace for form; import stays additive**) |

Keep existing:

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/admin/catalog/import` | Unchanged semantics |
| GET/POST | `/v1/admin/catalog/places*` | Unchanged |

#### Geo pickers (staff or public read)

Geo is already public-readable via RLS. Prefer thin backend wrappers for OpenAPI/client consistency:

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/geo/countries` | public or staff | Active countries |
| GET | `/v1/geo/cities?country=XX&q=` | public or staff | City picker |

(If product prefers staff-only geo admin routes, use `/v1/admin/geo/...` — decision D7.)

#### Audit

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/admin/audit-events?entityType=destination&entityId=` | administrator+ (per D1) | Paginated history |

#### Public destinations

No behavioral change. Optional later: include `parentSlug` on public detail — **only if** product wants hierarchy on consumer APIs (decision D8); default leave public schema stable.

### 3.3 Suggested OpenAPI schemas (names)

- `DestinationAdmin` — staff fields including `lifecycleStatus`, actors, `rejectionReason`, `externalKey`, `parentId`, `tags[]`, `sources[]`  
- `DestinationAdminListResponse` — `{ items, limit, offset, total? }`  
- `CreateDestinationRequest` / `UpdateDestinationRequest`  
- `TransitionRequest` (reuse places)  
- `GeoCountry` / `GeoCity` / list responses  
- `AuditEvent` / `AuditEventListResponse`

operationId examples: `adminListCatalogDestinations`, `adminGetCatalogDestination`, `adminCreateCatalogDestination`, `adminUpdateCatalogDestination`, `adminTransitionCatalogDestination`, `listGeoCountries`, `listGeoCities`, `adminListAuditEvents`.

---

## 4. Proposed frontend routes and components

### 4.1 Routes

```
apps/helm-admin/app/
  login/page.tsx
  (staff)/layout.tsx          # auth gate + shell
  (staff)/page.tsx            # redirect → /destinations
  (staff)/destinations/page.tsx
  (staff)/destinations/new/page.tsx
  (staff)/destinations/[id]/page.tsx
  (staff)/import/page.tsx
  (staff)/places/page.tsx     # Milestone B
```

### 4.2 Components (minimal, no new UI framework unless approved)

- `StaffShell` — nav + user menu  
- `DestinationFilters` + `DestinationTable`  
- `DestinationForm` — bilingual fields, geo pickers, parent select  
- `LifecycleActions` — buttons filtered by role + allowed transitions  
- `TagsEditor`, `ProvenanceList`, `AuditTimeline`  
- `ImportWorkbench` — JSON editor, dry-run result, apply  

Styling: start with structured CSS modules or a single `globals.css`; **avoid** adding Tailwind/UI kits unless approved (no paid deps; minimize packages).

### 4.3 Data access

```ts
import { createHelmClient } from "@helm/api-client-ts";
// client configured with baseUrl + getAccessToken() from session
```

Server Components may call backend with forwarded Bearer token; mutations via client components or server actions that still hit `/v1` (no direct DB).

---

## 5. Authentication / session design

### 5.1 Target production flow

1. Staff signs in via **Supabase Auth** in `helm-admin` (email/password or magic link — product choice).  
2. Store session with `@supabase/ssr` cookie pattern (or equivalent maintained Supabase Next helper) — **anon key only**.  
3. Middleware protects `(staff)/*`; unauthenticated → `/login`.  
4. Each API call: `Authorization: Bearer <access_token>`.  
5. Backend JwtAuthGuard verifies JWT (identity only).  
6. PrincipalResolver loads roles from `identity.user_roles` (`rolesSource: 'database'`).  
7. RolesGuard + CatalogAdminService assert staff/admin.  
8. UI hides admin-only actions, but **server remains source of truth**.

### 5.2 Local development

- Prefer same Supabase project or local Supabase with seeded staff users.  
- Backend `AUTH_PROVIDER=mock` remains for backend unit tests only.  
- Admin UI must not “succeed” without a real Bearer token accepted by the configured backend.

### 5.3 Explicit prohibitions

- No service-role key in Next env exposed to browser.  
- No trusting `app_metadata.role` alone for authorization.  
- No placeholder “logged in as admin” bypass in production builds.

---

## 6. RLS and security strategy

1. Keep FORCE RLS on catalog tables; do not weaken public published-only policies.  
2. Destination mutations through Nest using the existing DB role of the connection:  
   - If backend uses a privileged Drizzle role today, **application-layer authz remains mandatory** (already true for places). Document whether Step 6 should move toward user-scoped DB sessions (decision D9 — large change; recommend defer).  
3. Mirror place transition authz for destinations (`ADMIN_ONLY_TARGETS`).  
4. Operators cannot write destination media (existing RLS) — UI must not offer upload/edit for operators.  
5. Audit select remains admin+; operators rely on row-level actor timestamps unless D1 changes.  
6. Public mapper continues to strip internals.  
7. Import apply remains administrator+.

---

## 7. Testing strategy

| Layer | Tests |
|-------|-------|
| Domain | Lifecycle transitions for destinations (unit) |
| API | Authz: customer 401/403; operator create/edit/submit; operator blocked from publish; admin publish; unpublished not public |
| Import | Existing import tests remain green; UI dry-run wiring optional e2e later |
| RLS | Extend `rls_step5.sql` if policies/indexes change; always run `./scripts/test-rls.sh` |
| OpenAPI | `pnpm codegen` cleanliness in CI |
| Admin | Typecheck; later Playwright smoke for login + list (optional Milestone C) |
| Regression | Full backend suite (55+), web/admin typecheck |

---

## 8. Implementation sequence and dependencies

```
6.0  Design docs (this PR) ───────────────────────────── approved
6.1  OpenAPI destination admin + geo + audit contracts
       → codegen TS/Dart
6.2  Backend: repository mutations + admin service/controller
       → tests (authz, lifecycle, public isolation)
6.3  Optional additive migrations (indexes/FK/cycle)
       → RLS harness
6.4  helm-admin auth session + staff shell
6.5  Destinations list/create/edit/lifecycle UI
6.6  Import workbench UI (calls existing import API)
6.7  Audit panel + polish + docs update
6.8  (Optional) Places admin UI on existing place APIs
```

**Dependency graph:** 6.1 → 6.2 → 6.5; 6.4 can parallel 6.2 after 6.1 client stubs exist; 6.3 can parallel 6.2; 6.6 needs 6.4; 6.7 needs 6.2 audit endpoint.

### Recommended first implementation milestone (Step 6.1)

**Milestone A — “Destinations API + Admin shell”**

1. OpenAPI: staff destination list/get/create/patch/transition (+ geo list).  
2. Codegen.  
3. Nest implementation + tests.  
4. `helm-admin` login + shell + destinations list/detail/create wired to real APIs.  
5. No media upload; import UI can be Milestone A.5 or B.

Defer places UI and audit panel polish to Milestone B if needed.

---

## 9. Risks and unresolved decisions

### 9.1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend DB connection bypasses RLS | App bug = data leak/write | Keep fail-closed RolesGuard; add integration tests; consider user-scoped DB later (D9) |
| Dual tag models (`tags[]` vs `destination_tags`) | UI confusion | Prefer structured `destination_tags` in admin; treat `tags[]` as legacy/import mirror |
| Dual media models (`media_refs` vs `destination_media`) | Same | Prefer `destination_media`; leave `media_refs` read-only/legacy |
| Parent hierarchy without cycle checks | Bad trees | App validation + optional DB trigger |
| `country_code` without FK | Orphan codes | Validate on write; optional FK migration |
| Admin auth package sprawl | Extra deps | Use only `@supabase/ssr` + `@supabase/supabase-js` if approved; no paid auth vendors |
| Scope creep into places/media | Delays destinations | Enforce Milestone A boundaries |

### 9.2 Decisions requiring approval

| ID | Topic | Recommendation |
|----|-------|----------------|
| D1 | Operator audit read | Admin+ only for audit API |
| D2 | Slug edit after publish | Lock after verified |
| D3 | region/area FKs on destinations | Defer; use parent destinations |
| D4 | Auth providers for admin | Supabase email auth; mock only for backend tests |
| D5 | Media upload in Step 6 | Defer |
| D6 | Places UI timing | Milestone B |
| D7 | Geo endpoints public vs admin | Public read OK (matches RLS); keep thin `/v1/geo/*` |
| D8 | Public parent hierarchy fields | Defer; keep public schema stable |
| D9 | User-scoped Postgres sessions | Defer; document as future hardening |
| D10 | Tag form semantics | Explicit replace on PUT for forms; import remains additive |
| D11 | Add Tailwind / component library? | **No** unless requested — CSS modules first |

### 9.3 Schema / security concerns (documented, not changed in 6.0)

1. **No FK** on `destinations.country_code` → `geo.countries`.  
2. **No cycle protection** on `parent_id`.  
3. **Audit table** lacks entity lookup index; history API not implemented.  
4. **Operators cannot SELECT audit** under current RLS.  
5. **Drizzle schema drift** vs SQL for destinations (raw SQL used — OK, but keep codegen/types honest).  
6. **helm-admin has zero route protection** today.  
7. OpenAPI/client may lag controller if codegen not run (process risk).

---

## 10. Deliverables checklist for Step 6.0

- [x] Audit DB / backend / API / admin on `main` @ `19361d3`  
- [x] `docs/STEP6_CATALOG_OPERATIONS_SPEC.md`  
- [x] `docs/STEP6_IMPLEMENTATION_PLAN.md`  
- [ ] Product approval of D1–D11  
- [ ] Authorization to start Step 6.1 (Milestone A)

---

## 11. Appendix — inventory snapshots

### Admin routes today

```
GET  /v1/admin/catalog/places
POST /v1/admin/catalog/places
POST /v1/admin/catalog/places/:id/transition
POST /v1/admin/catalog/import
```

### Public destination routes today

```
GET /v1/destinations
GET /v1/destinations/:slug
```

### helm-admin source files today

```
app/layout.tsx
app/page.tsx
next.config.ts
package.json
README.md
```
