# Helm حلم — Step 6 Catalog Operations & Admin Foundation

**Document type:** Functional specification  
**Status:** Draft for product/engineering approval (Step 6.0)  
**Base:** `main` @ `19361d38919a4b12c519974cf4b248762c8edb3a` (Step 5 merged)  
**First operational module:** Destinations  
**Companion:** [`STEP6_IMPLEMENTATION_PLAN.md`](./STEP6_IMPLEMENTATION_PLAN.md)

---

## 1. Purpose

Step 6 delivers the **operator/administrator catalog operations layer**: a real `apps/helm-admin` experience backed by NestJS `/v1` APIs, with **manual forms** and **bulk JSON import** as first-class workflows.

Priority order for Step 6:

1. Destination management (this specification’s primary scope)
2. Shared admin shell, auth session, and import UX
3. Place management UI (reuses Step 5 APIs; secondary in the same step if capacity allows)

Out of scope for Step 6: AI itineraries, booking/payments, live availability/FX, scraping, paid media CDNs, mobile admin, consumer web discovery UI beyond existing public APIs.

---

## 2. Product principles

| Principle | Rule |
|-----------|------|
| Dual input | Every curated catalog entity can be created/updated via **dashboard forms** and/or **JSON import**. |
| Geo reuse | Destinations **must not** duplicate `geo.countries` / `geo.cities` / `geo.regions` / `geo.areas`. Geo tables remain canonical reference data. |
| Hierarchy | Destinations may nest (country → city → area/island neighborhood) via `parent_id`. Examples: Thailand → Bangkok; Indonesia → Bali → Ubud. |
| Lifecycle | Authoritative status is `lifecycle_status`. Preserve: `draft → pending_verification → verified → approved → published`, plus `rejected` and `archived`. |
| Public safety | Public APIs expose **published** destinations only. Unpublished content is staff-only. |
| Authz | JWT proves identity; **database roles** authorize. No JWT role trust, no service-role secrets in the browser. |
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
| Sign in to `helm-admin` | Yes (staff) | Yes |
| List/search destinations (all lifecycles) | Yes | Yes |
| View destination detail (incl. provenance, actors, rejection) | Yes | Yes |
| Create destination as `draft` (or other creatable status) | Yes | Yes |
| Edit destination while lifecycle ∈ `{draft, pending_verification, rejected}` | Yes | Yes |
| Edit destination while lifecycle ∈ `{verified, approved, published, archived}` | No (RLS + API) | Yes |
| Submit for verification (`→ pending_verification`) | Yes | Yes |
| Verify / approve / publish / archive | No | Yes |
| Reject (with reason) | No (admin-only targets include reject-from-staff-queue paths that land in admin-only states; operators may not set `verified`/`approved`/`published`/`archived`) | Yes |
| Attach/update tags & provenance on draft/pending/rejected parents | Yes | Yes |
| Attach/update tags & provenance on published parents | No | Yes |
| Dry-run JSON import | Yes | Yes |
| Apply JSON import | No | Yes |
| View audit history for a destination | Read via admin API (admin+ for audit select RLS; operators may need admin-mediated summary — see open decision D1) | Yes |
| Call public APIs for unpublished destinations | No | No |

**Rule retained from Step 5:** Operators may curate permitted draft/pending/rejected records and submit for verification. Administrators retain privileged verification, approval, publishing, import-apply, and archival.

---

## 4. Domain model — Destination

A **destination** is a curated travel entity that may represent a country, island, region, city, or area for traveler-facing packaging. It is **not** a geo row clone.

### 4.1 Relationships

```
geo.countries  ←—— country_code ——  catalog.destinations
geo.cities     ←—— city_id ————     catalog.destinations
catalog.destinations.parent_id → catalog.destinations (optional tree)
catalog.destination_tags → catalog.tags
catalog.entity_sources → catalog.sources (entity_type = destination)
catalog.destination_media → catalog.media_assets
```

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

Creation never starts as `verified`, `approved`, or `published` (DB enforced).

Public visibility: **`published` only**.

---

## 5. Admin navigation and screens

### 5.1 Shell

`apps/helm-admin` (Next.js App Router, port 3001):

- Staff-only shell (sidebar + top bar)
- Brand: Helm حلم Admin
- Primary nav (Step 6):
  - Destinations
  - Places (list/create may reuse Step 5 APIs; can be read-only link in early milestone)
  - Import
  - (Future) Tags / Sources / Audit — optional later

### 5.2 Destination screens

| Screen | Route (proposed) | Purpose |
|--------|------------------|---------|
| Destination list | `/destinations` | Search, filters, pagination, quick lifecycle badge |
| Destination create | `/destinations/new` | Manual create form |
| Destination detail / edit | `/destinations/[id]` | View + edit + lifecycle actions + tags + provenance + audit panel |
| Import | `/import` | Upload/paste JSON, dry-run preview, apply (admin) |

### 5.3 List filters (required)

- Free-text `q` (name EN/AR, slug)
- `lifecycleStatus` (multi or single)
- `countryCode`
- `isFeatured` (optional)
- `parentId` / “top-level only” (optional)
- Server-side `limit` + `offset` (or cursor later); default page size 20, max 100

### 5.4 Detail tabs / sections

1. **Overview** — identity, bilingual content, featured, website, address  
2. **Geography** — country picker, city picker (scoped by country), lat/lng, timezone, parent destination  
3. **Tags** — structured tags from `catalog.tags`  
4. **Provenance** — linked `entity_sources` / sources (staff-only)  
5. **Lifecycle** — current status, allowed transitions, rejection reason, actor timestamps  
6. **Audit** — chronological events for this destination id (when API available)  
7. **Media** — metadata/refs only in Step 6 (no live Storage upload unless approved)

---

## 6. Form fields and validation

### 6.1 Create / update fields

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | Yes | Unique; URL-safe; immutable after publish preferred (open decision D2) |
| `nameEn` / `nameAr` | Yes | |
| `shortDescriptionEn` / `shortDescriptionAr` | No | |
| `summaryEn` / `summaryAr` | No | |
| `descriptionEn` / `descriptionAr` | No | Long body |
| `countryCode` | Yes | Must exist in `geo.countries` |
| `cityId` | No | Must exist in `geo.cities` and match country when set |
| `parentId` | No | Must exist; must not create cycles; recommend same country |
| `timezone` | No | IANA string; may default from city |
| `latitude` / `longitude` | No | |
| `addressText` | No | |
| `websiteUrl` | No | Valid URL when present |
| `isFeatured` | No | Default false |
| `externalKey` | No | Unique when set; strongly recommended for import parity |
| `tagSlugs[]` | No | Must resolve to active tags |
| `sources[]` | No | Provenance objects (type, name, url, notes, collectedAt) |

### 6.2 Validation rules

- Country code must resolve to an active `geo.countries` row.
- If `cityId` set, city’s `country_code` must equal destination `countryCode`.
- `parentId` ≠ self; depth/cycle checks in application service.
- Lifecycle transitions validated by shared domain + DB triggers.
- Rejection requires non-empty `rejectionReason` when transitioning to `rejected`.
- Operators cannot update non-curatable lifecycle rows (API mirrors RLS).
- Public responses never include `externalKey`, actor ids, rejection internals, or unpublished rows.

---

## 7. Workflows

### 7.1 Manual create → publish

1. Operator creates destination (starts `draft`).  
2. Operator edits content, tags, provenance.  
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
4. All imported destinations remain `draft` until manual lifecycle progression.  
5. Preserve Step 5 `updateIfExists` semantics (omission keeps curated optionals; tags/sources additive; conflicts rejected).

Operators may dry-run; only administrators may apply.

---

## 8. Public API behavior (unchanged contract intent)

| Endpoint | Behavior |
|----------|----------|
| `GET /v1/destinations` | Published only; filters country/featured/q; pagination |
| `GET /v1/destinations/{slug}` | Published only; 404 otherwise |

Step 6 must not weaken these guarantees. Admin-only data stays under `/v1/admin/...`.

---

## 9. Non-functional requirements

- All admin mutations go through NestJS — **no direct browser→Postgres writes**.  
- Frontend uses anon/user JWT only; **never** service-role keys.  
- Fail closed when DB roles cannot be loaded (`rolesSource !== 'database'`).  
- Audit writes for create/update/transition/import; scrub secrets.  
- Bilingual EN/AR content supported in forms and list search.  
- Egypt-outbound product initially, but schema/UI must not hardcode Egypt-only destinations.  
- No paid dependencies without explicit approval.

---

## 10. Acceptance criteria (Destinations module)

### 10.1 Functional

- [ ] Staff can sign in to `helm-admin` and reach Destinations only with staff DB roles.  
- [ ] Staff can list destinations across lifecycles with search, country, lifecycle filters, and pagination.  
- [ ] Operator can create and edit draft/pending/rejected destinations via form.  
- [ ] Operator cannot publish or edit published destinations.  
- [ ] Administrator can verify, approve, publish, reject (with reason), and archive per lifecycle rules.  
- [ ] Parent hierarchy can be set and displayed (Thailand → Bangkok style).  
- [ ] Country/city pickers use `geo` data; invalid city/country combinations rejected.  
- [ ] Tags and provenance visible to staff; not leaked on public APIs.  
- [ ] JSON import dry-run and apply work from admin UI using existing import contract.  
- [ ] Unpublished destinations never appear on public endpoints.  
- [ ] Audit history for destination mutations is available to authorized staff (per D1).

### 10.2 Engineering

- [ ] OpenAPI updated; TS/Dart clients regenerated (no hand edits).  
- [ ] Any schema change is additive migration + RLS coverage.  
- [ ] Backend tests for destination admin authz + lifecycle.  
- [ ] RLS harness updated if policies change.  
- [ ] Admin typecheck and CI green.  
- [ ] No service-role credentials in frontend.

### 10.3 Explicit non-goals for acceptance

- Live Storage image upload UI  
- Full place CMS parity  
- Consumer marketing site  
- Automated publish on import  

---

## 11. Open product decisions (require approval)

| ID | Question | Options / recommendation |
|----|----------|---------------------------|
| D1 | May operators read `ops.audit_events` for destinations? | **Recommend:** admin+ only for full audit API; operators see lifecycle actor timestamps on the destination row. |
| D2 | Is `slug` editable after publish? | **Recommend:** editable only in draft/pending/rejected; locked once verified+ unless admin force (logged). |
| D3 | Should destinations link `region_id` / `area_id`? | Schema today has country + city only. **Recommend:** defer; model regions/areas as parent destination nodes or add additive FKs in a later milestone. |
| D4 | Admin auth path for local/dev vs production | **Recommend:** production Supabase Auth password/magic-link for staff; local may use backend mock JWT issuer **only** behind non-production env — never fake success without token validation. |
| D5 | Media in Step 6 | **Recommend:** read/list media refs + cover flag; upload deferred. |
| D6 | Places UI in same PR train | **Recommend:** Destinations + Import + Auth shell first (Milestone A); Places list/create next (Milestone B). |

---

## 12. Success definition

Step 6 Destinations is successful when a staff member can curate a hierarchical destination tree (e.g. Indonesia → Bali → Ubud) through the admin dashboard **and** through JSON import, progress it through the existing lifecycle to published, and confirm it appears on public destination APIs — without bypassing RLS, OpenAPI, or database-backed roles.
