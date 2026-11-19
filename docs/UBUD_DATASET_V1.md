# Helm حلم — Ubud Curated Travel Catalogue (Dataset v1)

Staging dataset for **Ubud, Bali, Indonesia**. Exactly **20** curated places for import testing.

**Do not auto-apply to a database. Do not publish. All records remain draft / needs verification.**

| Item | Value |
|------|-------|
| Destination | Ubud (`ubud`) |
| Country | Indonesia (`ID`), currency `IDR` |
| Editorial source | `data/imports/indonesia/ubud/ubud-curated-v1.source.json` |
| Import-ready payload | `data/imports/indonesia/ubud/ubud-curated-v1.json` |
| Import format | `helm.catalog.import.v1` |
| Builder | `pnpm dataset:ubud:build` (`node scripts/build-ubud-dataset-v1.mjs`) |
| Validator | `pnpm dataset:ubud:validate` (uses backend `validateCatalogImport`) |

---

## Category distribution

| Category | Count | Catalog `category` values |
|----------|------:|---------------------------|
| Restaurants | 5 | `restaurant` |
| Cafes | 4 | `cafe` |
| Attractions | 3 | `attraction` |
| Activities | 4 | `activity` |
| Bars / nightlife | 4 | `bar` (1) + `nightlife` (3) |
| **Total** | **20** | |

---

## All 20 records

### Restaurants

| # | Name | External key | Subcategory | Rating | Reviews | Provider | Price tier |
|---|------|--------------|-------------|-------:|--------:|----------|------------|
| 1 | Hujan Locale | `ubud-hujan-locale` | modern_indonesian | 4.5 | 1691 | Tripadvisor | mid_range |
| 2 | Kubu at Mandapa | `ubud-kubu-at-mandapa` | fine_dining | 4.9 | 1489 | Tripadvisor | luxury |
| 3 | Moksa Ubud | `ubud-moksa` | plant_based | 4.7 | 1154 | Tripadvisor | mid_range |
| 4 | Murni’s Warung | `ubud-murnis-warung` | indonesian_balinese | 4.3 | 1849 | Tripadvisor | mid_range |
| 5 | Apéritif Restaurant | `ubud-aperitif-restaurant` | fine_dining | 4.9 | 434 | Tripadvisor | luxury |

### Cafes

| # | Name | External key | Subcategory | Rating | Reviews | Provider | Price tier |
|---|------|--------------|-------------|-------:|--------:|----------|------------|
| 6 | Suka Ubud | `ubud-suka-ubud` | brunch_specialty_coffee | 4.8 | 511 | *(unspecified)* | mid_range |
| 7 | Watercress Ubud | `ubud-watercress` | brunch_cafe | 4.5 | 1768 | *(unspecified)* | mid_range |
| 8 | Ivy Cafe | `ubud-ivy-cafe` | all_day_cafe | 5.0 | 1996 | *(unspecified)* | mid_range |
| 9 | Gangga Coffee Ubud | `ubud-gangga-coffee` | coffee_shop | 4.7 | 384 | *(unspecified)* | budget_mid_range |

### Attractions

| # | Name | External key | Area | Subcategory | Rating | Reviews |
|---|------|--------------|------|-------------|-------:|--------:|
| 10 | Sacred Monkey Forest Sanctuary | `ubud-sacred-monkey-forest` | Padangtegal, Ubud | nature_wildlife_cultural_site | 4.2 | 35730 |
| 11 | Campuhan Ridge Walk | `ubud-campuhan-ridge-walk` | Campuhan, Ubud | scenic_walk | 4.3 | 6789 |
| 12 | Tirta Empul Temple | `ubud-tirta-empul` | **Tampaksiring** | hindu_temple_cultural_site | 4.4 | 3644 |

### Activities

| # | Name | External key | Area | Subcategory | Rating | Reviews | Indicative start |
|---|------|--------------|------|-------------|-------:|--------:|------------------|
| 13 | Mount Batur Sunrise Trek | `ubud-mount-batur-sunrise-trek` | **Kintamani** | guided_volcano_trek | 5.0 | 1351 | USD 22 |
| 14 | Ubud ATV Quad Bike Adventure | `ubud-atv-quad-bike-adventure` | Greater Ubud / villages | atv_off_road | 4.9 | 1995 | USD 29 |
| 15 | Ayung River White-Water Rafting | `ubud-ayung-river-rafting` | **Payangan / Ayung River** | white_water_rafting | 4.9 | 615 | USD 23 |
| 16 | Balinese Cooking Class & Market Tour | `ubud-balinese-cooking-class` | Ubud | cooking_class_cultural_experience | 4.9 | 396 | USD 18 |

Activity prices are **indicative advertised starting prices**, not confirmed supplier quotes.

### Bars / nightlife

| # | Name | External key | Catalog category | Subcategory | Rating | Reviews | Provider |
|---|------|--------------|------------------|-------------|-------:|--------:|----------|
| 17 | Donna | `ubud-donna` | `bar` | restaurant_cocktail_bar | 4.9 | 2463 | Tripadvisor |
| 18 | No Más | `ubud-no-mas` | `nightlife` | live_music_cocktail_bar | 4.4 | 232 | business_listing_snapshot |
| 19 | The Blue Door Bar, Restaurant & Club | `ubud-blue-door` | `nightlife` | club_live_music | 4.8 | 114 | business_listing_snapshot |
| 20 | Lokal Bar Ubud | `ubud-lokal-bar` | `nightlife` | cocktail_live_music_bar | 4.9 | 28 | business_listing_snapshot |

---

## Destination metadata

- **Name:** Ubud / أوبود  
- **Slug:** `ubud`  
- **External key (import):** `id:ubud`  
- **Editorial type:** `destination_area` (not a DB enum — see mapping)  
- **Region:** Central Bali  
- **Parent (editorial):** Indonesia  
- **Tags:** culture, nature, jungle, rice_terraces, wellness, adventure, food, cafes  
- **Recommended duration:** 2–4 days  
- **Lifecycle:** draft, unpublished, `curated_needs_verification`

Nearby excursions are **not** implied to be central-Ubud walking distance:

- Mount Batur → Kintamani  
- Ayung rafting → Payangan / Ayung River  
- Tirta Empul → Tampaksiring  

---

## Two-file architecture

The editorial brief is richer than `helm.catalog.import.v1`. Helm does **not** redesign the schema for this dataset.

| File | Role |
|------|------|
| `ubud-curated-v1.source.json` | Rich editorial / staging truth (ratings structure, indicative prices, ranking hooks, areas, null unknowns) |
| `ubud-curated-v1.json` | Strict import payload for `POST /v1/admin/catalog/import` |

Rebuild both from the builder (single source of place definitions):

```bash
pnpm dataset:ubud:build
pnpm dataset:ubud:validate
```

---

## Import compatibility mapping

| Editorial field | Import field | Notes |
|-----------------|--------------|-------|
| `external_key` (`ubud-…`) | `slug` + mapped `externalKey` `id:ubud:…` | Hierarchical import key for idempotency; slug preserves the brief key |
| `name` / `name_ar` | `nameEn` / `nameAr` | Required bilingual |
| `destination_slug` | `destinationSlug` | Must resolve to destination in payload or DB |
| `category` / `subcategory` | same | Subcategory is free text (max 80) |
| `description` + area notes | `descriptionEn` | Area notes appended |
| `why_visit` | `shortDescriptionEn` | Truncated to 500 chars |
| `best_for` / tags | `tags` | Additive on re-import |
| `rating.*` | `rating.{value,scale,reviewCount,platform,observedAt}` | Platform preserves Tripadvisor vs business_listing_snapshot vs `provider_unspecified` |
| `price.tier` | `priceLevel` 1–4 | budget→1, mid/budget_mid→2, upscale→3, luxury→4 |
| `price` indicative USD | **not** `priceLevel`; disclosed in `descriptionEn` | Never written as confirmed catalog money |
| `coordinates` null | omitted | Do not invent lat/lng |
| `opening_hours` null | omitted | Dining detail import has no hours field |
| `address` null | omitted | |
| `booking_recommended` | `attraction|activity.bookingRequired` when known | Otherwise omitted |
| `visit_duration_minutes` | `typicalDurationMinutes` on attraction/activity | |
| `data_status` / `publication_status` | import always creates **draft** lifecycle | Never verified/published by import |
| `ranking_support` | **not imported** | Staging only |
| destination `type` / `parent` | **not imported** | No `destination_type`; import has no `parent_id` |
| `source_urls` | `sources[]` | Typed provenance; URLs only when real |

Category detail blocks:

| Category | Detail block | Mapped enums |
|----------|--------------|--------------|
| restaurant / cafe / bar | `dining` | cuisineTypes / mealTypes / dietaryOptions |
| attraction | `attraction` | attractionType ∈ landmark\|museum\|cultural\|natural\|viewpoint\|other |
| activity | `activity` | activityType ∈ adventure\|water_sports\|tour\|outdoor\|wellness\|other |
| nightlife | `nightlife` | venueType ∈ nightclub\|music_venue\|festival_venue\|bar_nightlife\|other |

---

## Unsupported / deferred fields

These exist in the editorial JSON (or brief) but are **not** first-class import columns:

1. `destination_area` typed destination  
2. Destination parent hierarchy (`parent_id`)  
3. Structured price amounts / currency rows for places  
4. Opening hours  
5. Exact coordinates / Maps place IDs  
6. Ranking composite scores  
7. `why_visit` / `best_for` as dedicated columns  
8. `curated_needs_verification` as a DB enum (lifecycle stays `draft`)  

**Apply-time geo prerequisite:** default `supabase/seed.sql` does **not** include country `ID` or currency `IDR`. Import apply will fail until `geo.countries` / `pricing.currencies` are provisioned. This dataset does **not** change migrations to force that.

---

## Data limitations

- Coordinates, street addresses, opening hours, booking URLs, and confirmed prices are **null / omitted**.  
- Cafe and most attraction/activity rating **providers were unspecified** in the brief → platform `provider_unspecified` (not silently labelled Tripadvisor).  
- Activity USD amounts are **indicative only**.  
- Arabic names are curated transliterations for import completeness — editorial review recommended.  
- No Google Maps IDs or external provider IDs.  
- No composite ranking while confidence is low.  
- Dataset is for **testing / staging**, not live inventory.

### Unknown / missing field summary

| Field | Status across 20 places |
|-------|-------------------------|
| `address` | all null |
| `coordinates` | all null |
| `opening_hours` | all null |
| `source_urls` | all empty arrays |
| `price.amount_*` (non-activity) | null |
| `price.tier` (attractions, bars/nightlife) | null |
| `last_verified_at` | all null |
| `booking_recommended` | set only where clearly implied (fine dining / activities); else null |
| Cafe rating provider | unspecified |
| Attraction/activity rating provider | unspecified |

---

## Source attribution

| Provider label | Used for |
|----------------|----------|
| Tripadvisor | Restaurants 1–5, Donna |
| business_listing_snapshot | No Más, Blue Door, Lokal Bar |
| provider_unspecified + manual_research source | Remaining cafes, attractions, activities |

Import `sources[].sourceType` maps to catalog enums (`maps_listing`, `other`, `manual_research`). Entity-source verification stays **unverified**.

---

## Ranking support (editorial only)

Each place includes:

- `rating_score` (raw rating value)  
- `review_volume` (raw review count)  
- `price_tier`  
- `experience_quality` → null  
- `distance_to_destination_center` → null  
- `data_confidence` → `low_curated_needs_verification`  
- `composite_rank` → null (explicitly not calculated)

Keep raw rating and review count separate from any future derived score.

---

## Extensibility

Directory convention:

```text
data/imports/<country-slug>/<destination-slug>/
  <destination>-curated-vN.source.json
  <destination>-curated-vN.json
```

Examples for later markets:

- `data/imports/indonesia/uluwatu/`  
- `data/imports/indonesia/canggu/`  
- `data/imports/indonesia/seminyak/`  
- `data/imports/thailand/<destination>/`  

### Adding a new place

1. Add the place definition to `scripts/build-ubud-dataset-v1.mjs` (or a future destination builder).  
2. Use a stable editorial key: `<destination>-<local-slug>` (e.g. `ubud-new-cafe`).  
3. Import external key becomes `id:<destination>:<local-slug>`.  
4. Set unknowns to `null` — never invent coords/prices/hours.  
5. Rebuild and validate:

```bash
pnpm dataset:ubud:build
pnpm dataset:ubud:validate
```

6. Dry-run import via admin API (`dryRun: true`) before apply.  
7. Do **not** change OpenAPI / migrations to fit one record.

### Adding a new destination

1. Create `data/imports/<country>/<destination>/`.  
2. Follow `helm.catalog.import.v1` with destination `externalKey` `id:<destination>` (or `id:<country>:<destination>` when needed).  
3. Ensure country code exists in `geo.countries` before apply.  
4. Keep places’ `destinationSlug` consistent.  
5. Document the dataset in `docs/` the same way as this file.

---

## Validation checklist

The validator asserts:

1. JSON parses  
2. Exactly 20 places (editorial + import)  
3. Unique external keys  
4. Non-empty names  
5. Categories ∈ supported taxonomy  
6. Destination relationship (`ubud` + `ID`)  
7. Ratings in 0–5  
8. Non-negative integer review counts  
9. Currency codes valid when present  
10. Unknown prices/coords remain null; activities omit `priceLevel`  
11. All records draft / curated_needs_verification  
12. Source attribution present on import places  
13. Indicative activity prices not treated as confirmed supplier prices  
14. Payload passes backend `validateCatalogImport` unchanged  

---

## How to import (manual, not automatic)

1. Ensure `ID` / `IDR` exist in geo/pricing.  
2. `POST /v1/admin/catalog/import` with body `{ "dryRun": true, "payload": <ubud-curated-v1.json> }`.  
3. Review preview.  
4. Apply only with administrator role and explicit approval (`dryRun: false`).  
5. Lifecycle remains **draft** until staff verify / publish through normal admin flows.

---

## Related docs

- `docs/CATALOG_IMPORT.md` — canonical import rules  
- `docs/examples/catalog-import.sample.json` — minimal fixture  
- `services/helm-backend/src/modules/catalog/domain/import-format.ts` — Zod contract  
