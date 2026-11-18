# Helm حلم — Step 6 Implementation Plan

**Document type:** Technical design / architecture audit  
**Status:** Approved (Step 6.0) — corrections locked; Step 6.1 not started  
**Base commit:** `19361d38919a4b12c519974cf4b248762c8edb3a` (`main`, Step 5 merge)  
**Branch for this design:** `cursor/step6-catalog-ops-design-3062`  
**Companion:** [`STEP6_CATALOG_OPERATIONS_SPEC.md`](./STEP6_CATALOG_OPERATIONS_SPEC.md)

---

## 1. Executive summary

Step 5 delivered catalog **data model**, **public discovery**, **place admin APIs**, **import writer**, and **RLS**. Destination **writes** today exist only via JSON import. `apps/helm-admin` is still a Step 2 skeleton (Next 15.5.29, no auth, no routes, unused API client).

Step 6 should **extend** Step 5 — not rewrite it — by:

1. Adding destination admin HTTP APIs (mirror place admin patterns).  
2. Adding public read-only geo lookup endpoints for country/city pickers (D7).  
3. Adding audit history read API (**administrator/super-administrator only**, D1).  
4. Building `helm-admin` shell + Destinations + Import UI on generated clients (D6).  
5. Wiring staff authentication via **Supabase email/password + SSR cookies** (D4).

**Create rule:** every newly created destination starts as **`draft`**, regardless of actor or entry path.  
**Hierarchy:** application validation **and mandatory database-level parent-cycle protection**.

**No production code or migrations are changed in Step 6.0** (documentation only).

---

## 2. Current-state architecture audit

### 2.1 Database

#### Geography (`20261118220000_step4_database_foundation.sql`)

| Table | Role | Destination link |
|-------|------|------------------|
| `geo.countries` | Canonical countries | `destinations.country_code` (**no FK today**) |
| `geo.regions` | Optional regions | **No destination FK** (deferred permanently for Step 6 — D3) |
| `geo.cities` | Cities + timezone/coords | `destinations.city_id` FK |
| `geo.areas` | Neighborhoods under cities | Places have `area_id`; destinations do not (D3) |

#### `catalog.destinations` (effective columns)

Identity: `id`, `slug` UNIQUE, `name_en/ar`, summaries, descriptions, short descriptions.  
Geo/packaging: `country_code`, `city_id`, `timezone`, `latitude`, `longitude`, `address_text`, `website_url`, `is_featured`.  
Hierarchy: `parent_id` → self (**no cycle protection today — mandatory in Step 6**).  
Legacy parallel fields: `tags text[]`, `media_refs jsonb`, `publish_status`, `verification_status` (synced from lifecycle).  
Lifecycle: `lifecycle_status` + verified/approved/rejected/archived actors & timestamps + `rejection_reason`.  
Import: `external_key` (partial unique, `20261118232000`).

Indexes: country, publish pair, lifecycle, parent, external_key.  
**Gaps:** no name search index; no composite list index `(lifecycle_status, updated_at)`; no FK from `country_code` → `geo.countries`; **no cycle guard on `parent_id`**; no published-slug alias/redirect table yet (needed for D2 exceptional changes).

#### Related tables (reuse)

- `catalog.tags`, `destination_tags`  
- `catalog.sources`, `entity_sources`  
- `catalog.media_assets`, `destination_media`  
- `catalog.import_runs`  
- `ops.audit_events` — **no `(entity_type, entity_id)` index**

#### Lifecycle enforcement (DB)

Triggers on destinations: sync legacy statuses, enforce transition graph, block create-as-published. Same graph as places / `lifecycle.ts`.  
**Step 6 create API must force `draft` for all actors** (stricter product rule than “any creatable status”).

#### RLS (destinations + related)

| Actor | Destinations | Destination tags / entity_sources | Destination media | Audit |
|-------|--------------|-----------------------------------|-------------------|-------|
| Customer | SELECT published only | via published parent / staff rules | public media only | no |
| Operator | INSERT/UPDATE when lifecycle ∈ draft\|pending\|rejected | same parent rule | **no write** (admin media) | INSERT only |
| Administrator | full | full | yes | SELECT + INSERT |

Geo: public read; admin write (geo **HTTP** write remains out of scope — D7).

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
| `CatalogImportWriter` | destination upsert + tags/sources | Production-ready for bulk path (creates draft; tags additive) |
| `lifecycle.ts` | shared rules | Used by places; ready for destinations |
| `AuditService` | write-only `record()` | No history query API |
| Auth | JwtAuthGuard → PrincipalResolver → DB `identity.user_roles` → RolesGuard | Fail-closed for staff |

Drizzle `schema.ts` destinations mirror is **partial**; repository correctly uses raw SQL for full columns.

### 2.3 API / OpenAPI / clients

Public destination ops: `listDestinations`, `getDestination` + `DestinationPublic` (**preserve contract — D8**).  
Admin ops today: `adminListCatalogPlaces`, `adminCreateCatalogPlace`, `adminTransitionCatalogPlace`, `adminImportCatalog`.  
**Missing OpenAPI:** destination admin CRUD/list/transition, public geo lists, audit history, published slug alias support as needed for D2.  
Generated `@helm/api-client-ts` / Dart clients follow OpenAPI; `helm-admin` declares TS client but does not import it yet.

### 2.4 Frontend (`apps/helm-admin`)

| Item | Finding |
|------|---------|
| Next.js | **15.5.29**, React 19.1.1, App Router |
| Port | 3001 |
| Routes | `/` placeholder only |
| Auth | None (no Supabase SSR, no middleware) |
| Styling | Inline styles only — Step 6 uses **CSS Modules** (D11); **no Tailwind** |
| API | `@helm/api-client-ts` linked + transpiled; **unused** |
| Verdict | **Skeleton** — no admin functionality |

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
| DB | **Mandatory** parent-cycle protection; audit entity index; list/search indexes; optional `country_code` FK; slug redirect/alias support for D2 |
| API | Staff destination list/get/create/update/transition; PUT tags replace; public geo lists; admin audit history; exceptional published slug change |
| Admin UI | Supabase SSR auth, shell, destination screens, import UI (CSS Modules) |
| Tests | Destination admin authz/integration including privileged-connection unauthorized cases (D9); tag replace vs import additive (D10) |

---

## 3. Proposed database / API changes

### 3.1 Database (additive only — implement in 6.1+)

| Change | Priority | Rationale |
|--------|----------|-----------|
| **Mandatory** trigger/function: reject `parent_id` self-reference and ancestor cycles | **Required** | Hierarchy safety (app + DB) |
| Index `ops.audit_events (entity_type, entity_id, created_at DESC)` | High | Audit panel (admin+) |
| Index destinations `(lifecycle_status, updated_at DESC)` and/or `lower(name_en)` | Medium | Staff list/search |
| FK `catalog.destinations.country_code → geo.countries(code)` | Medium | Integrity (validate existing data first) |
| Additive slug alias/redirect mechanism for post-publish exceptional renames (D2) | High when D2 exception is implemented | Preserve old public URLs |
| **Do not** recreate destinations or geo tables | — | — |
| **Do not** add `region_id` / `area_id` on destinations (D3) | — | Parent hierarchy + geo tables |

No RLS redesign required for core destination CRUD if APIs use the same role patterns; extend `rls_step5.sql` only if policies change.

### 3.2 Proposed endpoint contracts

All under `/v1`, OpenAPI first, then Nest + codegen.

#### Destinations admin

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/admin/catalog/destinations` | operator+ | Staff list: `q`, `lifecycleStatus`, `country`, `featured`, `parentId`, `limit`, `offset` |
| GET | `/v1/admin/catalog/destinations/{id}` | operator+ | Full staff destination (lifecycle, actors, tags, sources, media refs) |
| POST | `/v1/admin/catalog/destinations` | operator+ | **Always create `draft`** (ignore any client-supplied lifecycle) |
| PATCH | `/v1/admin/catalog/destinations/{id}` | operator+ / admin per RLS | Update fields; slug rules per D2 |
| POST | `/v1/admin/catalog/destinations/{id}/transition` | operator+ with admin-only targets | `{ to, rejectionReason? }` |
| PUT | `/v1/admin/catalog/destinations/{id}/tags` | operator+/admin per parent lifecycle | **Explicit replace** of tag set (D10); transactional |
| POST | `/v1/admin/catalog/destinations/{id}/slug` (or equivalent) | administrator+ | Exceptional published slug change + alias/redirect + audit (D2) |

Keep existing:

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/admin/catalog/import` | Unchanged; creates draft; tags/sources **additive** |
| GET/POST | `/v1/admin/catalog/places*` | Unchanged |

#### Geo pickers (D7)

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/geo/countries` | **public**, read-only | Active countries |
| GET | `/v1/geo/cities?country=XX&q=` | **public**, read-only | City picker |

**No write methods** on `/v1/geo/*`.

#### Audit (D1)

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/v1/admin/audit-events?entityType=destination&entityId=` | **administrator / super-administrator only** | Paginated history |

Operators do **not** receive this API; they use lifecycle actor timestamps on the destination resource.

#### Public destinations (D8)

No behavioral or schema change to `DestinationPublic`. No `parentId` / `parentSlug` on public responses in Step 6.

### 3.3 Suggested OpenAPI schemas (names)

- `DestinationAdmin` — staff fields including `lifecycleStatus`, actors, `rejectionReason`, `externalKey`, `parentId`, `tags[]`, `sources[]`  
- `DestinationAdminListResponse` — `{ items, limit, offset, total? }`  
- `CreateDestinationRequest` / `UpdateDestinationRequest` (no client lifecycle on create)  
- `TransitionRequest` (reuse places)  
- `ReplaceDestinationTagsRequest`  
- `GeoCountry` / `GeoCity` / list responses  
- `AuditEvent` / `AuditEventListResponse`  
- Slug-exception request/response as needed for D2  

operationId examples: `adminListCatalogDestinations`, `adminGetCatalogDestination`, `adminCreateCatalogDestination`, `adminUpdateCatalogDestination`, `adminTransitionCatalogDestination`, `adminReplaceCatalogDestinationTags`, `listGeoCountries`, `listGeoCities`, `adminListAuditEvents`.

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
  (staff)/places/page.tsx     # Milestone B only (D6)
```

### 4.2 Components (CSS Modules — D11)

- `StaffShell` — nav + user menu  
- `DestinationFilters` + `DestinationTable`  
- `DestinationForm` — bilingual fields, geo pickers, parent select  
- `LifecycleActions` — buttons filtered by role + allowed transitions  
- `TagsEditor` (replace semantics), `ProvenanceList`, `AuditTimeline` (admin+ only)  
- `MediaRefsPanel` (read-only; D5)  
- `ImportWorkbench` — JSON editor, dry-run result, apply  

**Do not** add Tailwind or a UI component library.

### 4.3 Data access

```ts
import { createHelmClient } from "@helm/api-client-ts";
// client configured with baseUrl + getAccessToken() from Supabase session
```

Server Components may call backend with forwarded Bearer token; mutations via client components or server actions that still hit `/v1` (no direct DB).

---

## 5. Authentication / session design (D4)

### 5.1 Production / staff flow

1. Staff signs in via **Supabase Auth email/password** in `helm-admin`.  
2. Session stored with maintained **`@supabase/ssr`** cookie pattern — **anon key only**.  
3. Middleware protects `(staff)/*`; unauthenticated → `/login`.  
4. Each API call: `Authorization: Bearer <access_token>`.  
5. Backend JwtAuthGuard verifies JWT (identity only).  
6. PrincipalResolver loads roles from `identity.user_roles` (`rolesSource: 'database'`).  
7. RolesGuard + CatalogAdminService assert staff/admin and resource permissions.  
8. UI hides admin-only actions; **server remains source of truth**.

### 5.2 Local development

- Use Supabase (local or project) with seeded staff users and email/password.  
- Backend `AUTH_PROVIDER=mock` remains for **backend unit tests only** — **not** for admin UI login and **not** for production.  
- Admin UI must not present a fake login or succeed without a real Bearer token accepted by the configured backend.

### 5.3 Explicit prohibitions

- No service-role key in Next env exposed to browser.  
- No trusting `app_metadata.role` alone for authorization.  
- No placeholder “logged in as admin” bypass.  
- No production mock authentication in `helm-admin`.

---

## 6. RLS and security strategy (includes D9)

1. Keep FORCE RLS on catalog tables; do not weaken public published-only policies.  
2. **Defer user-scoped Postgres sessions (D9).** Document that the Nest/Drizzle connection may be privileged relative to RLS.  
3. **Regardless of connection privilege**, every backend request must enforce:
   - database-resolved roles (`rolesSource === 'database'` for staff routes), and  
   - resource-level permissions (lifecycle curatability, admin-only transitions, audit read, published slug exception).  
4. Test unauthorized operations (customer, operator on published rows, operator audit read, operator import apply) against the **actual** backend connection configuration — not only against RLS-as-user sessions.  
5. Mirror place transition authz for destinations (`ADMIN_ONLY_TARGETS`).  
6. Operators cannot write destination media (existing RLS) — UI offers display-only media (D5).  
7. Audit **select/list** remains administrator/super-administrator only (D1).  
8. Public mapper continues to strip internals; public schema unchanged (D8).  
9. Import apply remains administrator+.

---

## 7. Testing strategy

| Layer | Tests |
|-------|-------|
| Domain | Lifecycle transitions; create always draft; slug immutability after publish |
| DB | Parent cycle rejected by trigger; self-parent rejected |
| API authz | Customer 401/403; operator create/edit/submit; operator blocked from publish/edit published; admin publish; operator denied audit history; unpublished not public |
| D9 | Unauthorized ops against real Nest DB connection config |
| Tags (D10) | PUT replace transactional; import additive; both covered |
| D2 | Published slug blocked; admin exception writes audit + alias/redirect |
| Import | Existing import tests remain green |
| RLS | Extend harness if policies change; run `./scripts/test-rls.sh` |
| OpenAPI | `pnpm codegen` cleanliness in CI |
| Admin | Typecheck; CSS Modules only |
| Regression | Full backend suite, web/admin typecheck |

---

## 8. Implementation sequence and milestones

```
6.0  Design docs (this PR) ───────────────────────────── APPROVED
6.1  OpenAPI destination admin + geo (D7) + audit (D1) + tag PUT
       → codegen TS/Dart
6.2  Backend: repository mutations + admin service/controller
       → create-as-draft; slug rules; cycle checks
       → authz tests including D9 connection config
6.3  Additive migrations: MANDATORY parent-cycle protection,
       audit/list indexes, optional country FK, slug alias support
       → RLS harness as needed
6.4  helm-admin Supabase email/password + SSR cookies + staff shell (D4)
6.5  Destinations list/create/edit/lifecycle UI (CSS Modules, D11)
6.6  Import workbench UI (existing import API; additive tags)
6.7  Admin-only audit panel + media refs display (D5) + polish
6.8  Places admin UI — Milestone B only (D6)
```

**Dependency graph:** 6.1 → 6.2 → 6.5; 6.4 can parallel 6.2 after 6.1 client stubs exist; 6.3 can parallel 6.2; 6.6 needs 6.4; 6.7 needs 6.2 audit endpoint.

### Milestone A — Step 6.1 first implementation slice (approved scope)

**“Destinations API + Auth shell + Import”**

1. OpenAPI: staff destination list/get/create/patch/transition + PUT tags + public geo lists + admin audit list.  
2. Codegen.  
3. Nest implementation + tests (create always draft; D2/D9/D10 coverage; DB cycle protection migration).  
4. `helm-admin` Supabase email/password login + shell + destinations list/detail/create + import workbench.  
5. CSS Modules only; media display-only; no places UI; no public parent fields.

**Milestone B:** Places management UI on existing place APIs (D6).

---

## 9. Risks and approved decisions

### 9.1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Privileged DB connection bypasses RLS | App bug = data leak/write | Mandatory app-layer authz + D9 tests against real connection |
| Dual tag models (`tags[]` vs `destination_tags`) | UI confusion | Prefer structured `destination_tags`; form PUT replace; import additive |
| Dual media models | Confusion | Prefer `destination_media` display; leave `media_refs` legacy |
| Parent cycles | Bad trees | **Mandatory DB trigger** + app validation |
| Published slug change breaks links | SEO/bookmarks | D2 alias/redirect + audit |
| Auth package sprawl | Extra deps | Only `@supabase/ssr` + `@supabase/supabase-js` as needed (D4) |
| Scope creep into places/media upload | Delays | Enforce Milestone A (D5/D6) |

### 9.2 Approved decision register (D1–D11)

| ID | Decision | Status |
|----|----------|--------|
| **D1** | Full audit history is **administrator/super-administrator only**. Operators see necessary lifecycle actor timestamps on the destination row. | **Approved** |
| **D2** | Destination slugs are **editable before publication**. Once **published**, they are **immutable by default**. An exceptional administrator-only change must be **audited** and preserve the old public URL through a **redirect or alias**. | **Approved** |
| **D3** | **Defer** destination `region_id` / `area_id` foreign keys. Use destination **parent hierarchy** and existing canonical geography tables. | **Approved** |
| **D4** | **Supabase email/password** authentication for staff. Use maintained **Supabase SSR** integration and **secure cookies**. No fake login or production mock authentication. | **Approved** |
| **D5** | **Defer media uploads**. Display existing media references and metadata only. | **Approved** |
| **D6** | **Destinations + auth shell + import first**. Places management UI is **Milestone B**. | **Approved** |
| **D7** | Public read-only **`/v1/geo/countries`** and **`/v1/geo/cities`**. No write access through these endpoints. | **Approved** |
| **D8** | **Defer** public parent hierarchy fields. Preserve the existing public destination response contract. | **Approved** |
| **D9** | **Defer** user-scoped Postgres sessions. Every backend request must still enforce **database-resolved roles** and **resource-level permissions independently of RLS**. Document privileged-connection behavior and test unauthorized operations against the actual backend connection configuration. | **Approved** |
| **D10** | Manual tag editing uses **explicit replace** via **PUT**. JSON import remains **additive**. Both must be **transactional** and **tested**. | **Approved** |
| **D11** | **Do not** add Tailwind or a UI component library. Use **CSS Modules** and existing dependencies. | **Approved** |

### 9.3 Schema / security concerns (carry into 6.1)

1. **No FK** on `destinations.country_code` → `geo.countries` (optional additive fix).  
2. **No cycle protection** on `parent_id` today → **mandatory** in 6.1 migration.  
3. **Audit table** lacks entity lookup index; history API not implemented.  
4. **Operators cannot SELECT audit** under current RLS — matches D1.  
5. **Drizzle schema drift** vs SQL for destinations (raw SQL OK; keep honest).  
6. **helm-admin has zero route protection** today — fixed in 6.4.  
7. **No slug alias table** yet — required for D2 exceptional renames.  
8. Privileged Nest DB connection → document + D9 tests.

---

## 10. Deliverables checklist for Step 6.0

- [x] Audit DB / backend / API / admin on `main` @ `19361d3`  
- [x] `docs/STEP6_CATALOG_OPERATIONS_SPEC.md`  
- [x] `docs/STEP6_IMPLEMENTATION_PLAN.md`  
- [x] Product approval of D1–D11 recorded in both documents  
- [x] Consistency corrections (D2, create-as-draft, mandatory DB cycle protection, acceptance + milestones)  
- [ ] Merge PR #5  
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
