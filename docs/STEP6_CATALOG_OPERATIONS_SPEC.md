# Helm حلم — Step 6 Catalog Operations & Admin Foundation

**Document type:** Functional specification  
**Status:** Approved (Step 6.0) — corrections locked; Step 6.1 not started  
**Base:** `main` @ `19361d38919a4b12c519974cf4b248762c8edb3a` (Step 5 merged)  
**First operational module:** Destinations  
**Companion:** [`STEP6_IMPLEMENTATION_PLAN.md`](./STEP6_IMPLEMENTATION_PLAN.md)

---

## 1. Purpose

Step 6 delivers the **operator/administrator catalog operations layer**: a real `apps/helm-admin` experience backed by NestJS `/v1` APIs, with **manual forms** and **bulk JSON import** as first-class workflows.

Priority order for Step 6 (D6):

1. Destination management (primary)
2. Shared admin shell, auth session, and import UX
3. Place management UI — **Milestone B** (reuses Step 5 APIs; not Milestone A)

Out of scope for Step 6: AI itineraries, booking/payments, live availability/FX, scraping, paid media CDNs, mobile admin, consumer web discovery UI beyond existing public APIs, media upload (D5), public parent-hierarchy fields (D8).

---

## 2. Product principles

| Principle | Rule |
|-----------|------|
| Dual input | Every curated catalog entity can be created/updated via **dashboard forms** and/or **JSON import**. |
| Geo reuse | Destinations **must not** duplicate `geo.countries` / `geo.cities` / `geo.regions` / `geo.areas`. Geo tables remain canonical reference data. |
| Hierarchy | Destinations may nest via `parent_id` (e.g. Thailand → Bangkok; Indonesia → Bali → Ubud). **Database-level cycle protection is mandatory**, in addition to application validation. |
| Lifecycle | Authoritative status is `lifecycle_status`. Preserve: `draft → pending_verification → verified → approved → published`, plus `rejected` and `archived`. |
| Create as draft | **Every newly created destination starts as `draft`**, regardless of actor (operator or administrator) and regardless of create path (form or import). |
| Public safety | Public APIs expose **published** destinations only. Unpublished content is staff-only. |
| Authz | JWT proves identity; **database roles** authorize. Application-layer role and resource checks are mandatory on every backend request, independently of RLS (D9). No JWT role trust, no service-role secrets in the browser. |
| OpenAPI SoT | All HTTP contracts live in `packages/openapi/openapi.yaml`. Clients are generated, never hand-edited. |
| Additive schema | Database changes are versioned additive migrations only. |

---

## 3. Roles and permissions

### 3.1 Roles

| Role | Typical actor |
|------|----------------|
| `customer` | End travelers (no admin access) |
| `operator` | Catalog curators |
| `administrator` | Catalog owners / publishers |
| `super-administrator` | Platform owners (same catalog powers as administrator for Step 6) |

### 3.2 Destination permission matrix

| Capability | Operator | Administrator / super-administrator |
|------------|----------|-------------------------------------|
| Sign in to `helm-admin` (Supabase email/password) | Yes (staff) | Yes |
| List/search destinations (all lifecycles) | Yes | Yes |
| View destination detail (incl. provenance, actors, rejection) | Yes | Yes |
| Create destination (**always `draft`**) | Yes | Yes |
| Edit destination while lifecycle ∈ `{draft, pending_verification, rejected}` | Yes | Yes |
| Edit destination while lifecycle ∈ `{verified, approved, published, archived}` | No (RLS + API) | Yes |
| Edit `slug` before publication | Yes (while curatable / pre-publish) | Yes |
| Edit `slug` after publication | No | Exceptional only: audited, with redirect/alias preserving old public URL (D2) |
| Submit for verification (`→ pending_verification`) | Yes | Yes |
| Verify / approve / publish / archive | No | Yes |
| Reject (with reason) | No | Yes |
| Attach/update tags & provenance on draft/pending/rejected parents | Yes | Yes |
| Attach/update tags & provenance on published parents | No | Yes |
| Manual tag edit via form (`PUT` replace) | Yes when parent curatable | Yes per RLS |
| Dry-run JSON import | Yes | Yes |
| Apply JSON import | No | Yes |
| View full audit history | No (D1) | Yes |
| See lifecycle actor timestamps on the destination row | Yes | Yes |
| Call public APIs for unpublished destinations | No | No |

**Rule retained from Step 5:** Operators may curate permitted draft/pending/rejected records and submit for verification. Administrators retain privileged verification, approval, publishing, import-apply, and archival.

---

## 4. Domain model — Destination

A **destination** is a curated travel entity that may represent a country, island, region, city, or area for traveler-facing packaging. It is **not** a geo row clone.

### 4.1 Relationships

```
geo.countries  ←—— country_code ——  catalog.destinations
geo.cities     ←—— city_id ————     catalog.destinations
catalog.destinations.parent_id → catalog.destinations (optional tree; DB cycle-safe)
catalog.destination_tags → catalog.tags
catalog.entity_sources → catalog.sources (entity_type = destination)
catalog.destination_media → catalog.media_assets
```

**Deferred (D3):** no `region_id` / `area_id` on destinations. Regions/areas are expressed via the destination parent tree and/or existing geo tables for pickers.

### 4.2 Hierarchy examples (illustrative)

| Destination | Parent | Geo links |
|-------------|--------|-----------|
| Thailand | — | `country_code=TH` |
| Bangkok | Thailand | `country_code=TH`, `city_id`→ Bangkok city |
| Phuket | Thailand | `country_code=TH`, `city_id`→ Phuket city |
| Indonesia | — | `country_code=ID` |
| Bali | Indonesia | `country_code=ID`, city optional |
| Ubud | Bali | `country_code=ID`, `city_id` if available |

### 4.3 Lifecycle (unchanged)

| From | Allowed to |
|------|------------|
| draft | pending_verification, archived, rejected |
| pending_verification | verified, rejected, draft |
| verified | approved, rejected, pending_verification |
| approved | published, rejected, archived |
| published | archived |
| rejected | draft, pending_verification, archived |
| archived | draft |

**Create rule:** every new destination is inserted as **`draft` only**, for every actor and every entry path (manual form and JSON import). Creation never starts as `pending_verification`, `verified`, `approved`, `published`, `rejected`, or `archived`.

Public visibility: **`published` only**.

### 4.4 Slug rules (D2)

- Slugs are editable **before publication** (while the destination is not yet `published`).
- Once **`published`**, the slug is **immutable by default**.
- An **exceptional administrator/super-administrator-only** slug change after publication:
  - Must be explicitly intentional (not a normal edit field).
  - Must write an audit event.
  - Must preserve the old public URL via a **redirect or alias** so existing links continue to resolve.

---

## 5. Admin navigation and screens

### 5.1 Shell

`apps/helm-admin` (Next.js App Router, port 3001):

- Staff-only shell (sidebar + top bar) after Supabase email/password sign-in (D4)
- Brand: Helm حلم Admin
- Styling: **CSS Modules** only — no Tailwind, no UI component library (D11)
- Primary nav for Milestone A:
  - Destinations
  - Import
- Places appears in Milestone B (D6)

### 5.2 Destination screens

| Screen | Route (proposed) | Purpose |
|--------|------------------|---------|
| Destination list | `/destinations` | Search, filters, pagination, quick lifecycle badge |
| Destination create | `/destinations/new` | Manual create form (always creates `draft`) |
| Destination detail / edit | `/destinations/[id]` | View + edit + lifecycle actions + tags + provenance; audit panel for admin+ |
| Import | `/import` | Upload/paste JSON, dry-run preview, apply (admin) |

### 5.3 List filters (required)

- Free-text `q` (name EN/AR, slug)
- `lifecycleStatus` (multi or single)
- `countryCode`
- `isFeatured` (optional)
- `parentId` / “top-level only” (optional)
- Server-side `limit` + `offset`; default page size 20, max 100

### 5.4 Detail tabs / sections

1. **Overview** — identity, bilingual content, featured, website, address  
2. **Geography** — country picker, city picker (scoped by country), lat/lng, timezone, parent destination  
3. **Tags** — structured tags; form save uses **PUT replace** (D10)  
4. **Provenance** — linked `entity_sources` / sources (staff-only)  
5. **Lifecycle** — current status, allowed transitions, rejection reason, **actor timestamps** (visible to operators and admins)  
6. **Audit** — full chronological events for administrators/super-administrators only (D1)  
7. **Media** — **display existing media references and metadata only**; no upload in Step 6 (D5)

---

## 6. Form fields and validation

### 6.1 Create / update fields

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | Yes | Unique; URL-safe; editable before publish; immutable after publish except audited admin exception with redirect/alias (D2) |
| `nameEn` / `nameAr` | Yes | |
| `shortDescriptionEn` / `shortDescriptionAr` | No | |
| `summaryEn` / `summaryAr` | No | |
| `descriptionEn` / `descriptionAr` | No | Long body |
| `countryCode` | Yes | Must exist in `geo.countries` |
| `cityId` | No | Must exist in `geo.cities` and match country when set |
| `parentId` | No | Must exist; **no cycles** (app + **mandatory DB** protection) |
| `timezone` | No | IANA string; may default from city |
| `latitude` / `longitude` | No | |
| `addressText` | No | |
| `websiteUrl` | No | Valid URL when present |
| `isFeatured` | No | Default false |
| `externalKey` | No | Unique when set; strongly recommended for import parity |
| `tagSlugs[]` | No | Form: full replace via PUT; import: additive (D10) |
| `sources[]` | No | Provenance objects (type, name, url, notes, collectedAt) |

### 6.2 Validation rules

- Country code must resolve to an active `geo.countries` row.
- If `cityId` set, city’s `country_code` must equal destination `countryCode`.
- `parentId` ≠ self; cycle/depth checks in the **application service and in the database** (mandatory).
- Create always forces `lifecycle_status = draft` for every actor.
- Lifecycle transitions validated by shared domain + DB triggers.
- Rejection requires non-empty `rejectionReason` when transitioning to `rejected`.
- Operators cannot update non-curatable lifecycle rows (API mirrors RLS).
- Published slug changes are blocked unless the admin exception path is used (D2).
- Public responses never include `externalKey`, actor ids, rejection internals, or unpublished rows.
- Public destination response contract remains unchanged — no parent hierarchy fields added (D8).

---

## 7. Workflows

### 7.1 Manual create → publish

1. Staff creates destination — **always `draft`**, even if the actor is an administrator.  
2. Operator (or admin) edits content, tags (PUT replace), provenance.  
3. Operator submits `pending_verification`.  
4. Administrator verifies → approves → publishes.  
5. Public `GET /v1/destinations` / `:slug` show the destination.

### 7.2 Rejection / rework

1. Administrator rejects with reason.  
2. Operator edits (rejected is curatable) and resubmits.  
3. Or archive from rejected / approved / published per transition table.

### 7.3 Import workflow

1. Staff pastes or uploads JSON (`helm.catalog.import.v1`).  
2. **Dry-run** (`dryRun: true`): validation errors, would-create / would-update / skip counts; no catalog mutations (import run + audit may still record dry-run).  
3. Administrator **applies** (`dryRun: false`).  
4. All newly created destinations are **`draft`**.  
5. Preserve Step 5 `updateIfExists` semantics (omission keeps curated optionals; **tags/sources additive** on import; conflicts rejected).  
6. Manual form tag edits remain **explicit replace** and must not change import additive behavior (D10). Both paths are transactional and tested.

Operators may dry-run; only administrators may apply.

---

## 8. Public API behavior (unchanged contract intent)

| Endpoint | Behavior |
|----------|----------|
| `GET /v1/destinations` | Published only; filters country/featured/q; pagination |
| `GET /v1/destinations/{slug}` | Published only; 404 otherwise |
| `GET /v1/geo/countries` | Public read-only (D7) |
| `GET /v1/geo/cities` | Public read-only; filter by country (D7) |

Step 6 must not weaken published-only destination guarantees. Admin-only data stays under `/v1/admin/...`. Geo endpoints must not accept writes.

---

## 9. Non-functional requirements

- All admin mutations go through NestJS — **no direct browser→Postgres writes**.  
- Frontend uses anon/user JWT only; **never** service-role keys.  
- Staff auth: **Supabase email/password** with maintained **Supabase SSR** + secure cookies (D4). No fake login; no production mock authentication in the admin UI.  
- Fail closed when DB roles cannot be loaded (`rolesSource !== 'database'`).  
- Every backend request enforces database-resolved roles and resource-level permissions **independently of RLS** (D9). Privileged DB connection behavior must be documented and unauthorized operations tested against the actual connection configuration.  
- Audit writes for create/update/transition/import/exceptional slug change; scrub secrets. Full audit history API is administrator/super-administrator only (D1).  
- Bilingual EN/AR content supported in forms and list search.  
- Egypt-outbound product initially, but schema/UI must not hardcode Egypt-only destinations.  
- No paid dependencies without explicit approval.  
- No Tailwind / UI component library (D11).

---

## 10. Acceptance criteria (Destinations module)

### 10.1 Functional

- [ ] Staff sign in to `helm-admin` with Supabase email/password; non-staff cannot access staff routes (D4).  
- [ ] Staff can list destinations across lifecycles with search, country, lifecycle filters, and pagination.  
- [ ] Every create (form and import) yields `lifecycle_status = draft` for operator and administrator alike.  
- [ ] Operator can create and edit draft/pending/rejected destinations via form.  
- [ ] Operator cannot publish or edit published destinations.  
- [ ] Administrator can verify, approve, publish, reject (with reason), and archive per lifecycle rules.  
- [ ] Slugs editable before publish; published slugs immutable by default; exceptional admin slug change is audited and preserves old URL via redirect/alias (D2).  
- [ ] Parent hierarchy can be set and displayed; **DB rejects cycles** in addition to app validation.  
- [ ] Country/city pickers use public read-only `/v1/geo/*` (D7); invalid city/country combinations rejected.  
- [ ] Manual tag save uses transactional PUT replace; import tags remain additive; both tested (D10).  
- [ ] Provenance visible to staff; not leaked on public APIs.  
- [ ] Media section shows existing refs/metadata only; no upload UI (D5).  
- [ ] JSON import dry-run and apply work from admin UI using existing import contract.  
- [ ] Operators see lifecycle actor timestamps; full audit history is admin+ only (D1).  
- [ ] Unpublished destinations never appear on public endpoints; public destination schema unchanged (D8).  
- [ ] Places management UI is not required for Milestone A acceptance (D6).

### 10.2 Engineering

- [ ] OpenAPI updated; TS/Dart clients regenerated (no hand edits).  
- [ ] Additive migration includes **mandatory parent-cycle protection** (+ agreed indexes/FK as planned).  
- [ ] Backend tests for destination admin authz + lifecycle + unauthorized ops against the real DB connection config (D9).  
- [ ] Tag replace vs import additive semantics covered by tests (D10).  
- [ ] RLS harness updated if policies change.  
- [ ] Admin typecheck and CI green; CSS Modules only (D11).  
- [ ] No service-role credentials in frontend.

### 10.3 Explicit non-goals for acceptance

- Live Storage image upload UI  
- Full place CMS parity (Milestone B)  
- Consumer marketing site  
- Automated publish on import  
- Public parent hierarchy fields  
- User-scoped Postgres sessions  
- Tailwind / component library  

---

## 11. Approved decision register (D1–D11)

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

---

## 12. Success definition

Step 6 Destinations is successful when a staff member can curate a hierarchical destination tree (e.g. Indonesia → Bali → Ubud) through the admin dashboard **and** through JSON import, with every create starting as `draft`, progress it through the existing lifecycle to published, and confirm it appears on public destination APIs — without bypassing RLS, OpenAPI, database-backed roles, or the approved D1–D11 constraints.
