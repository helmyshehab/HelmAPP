# Helm حلم — Uluwatu Curated Travel Catalogue (Dataset v1)

Staging dataset for **Uluwatu / Bukit Peninsula, Bali, Indonesia**. Exactly **30** curated places for import testing.

**Do not auto-apply to a database. Do not publish. All records remain draft / needs verification.**

Research leads are **not** verified inventory. Replace closed, duplicated, or unverifiable leads before publish.

| Item | Value |
|------|-------|
| Destination | Uluwatu (`uluwatu`) |
| Country | Indonesia (`ID`), currency `IDR` |
| Editorial source | `data/imports/indonesia/uluwatu/uluwatu-curated-v1.source.json` |
| Import-ready payload | `data/imports/indonesia/uluwatu/uluwatu-curated-v1.json` |
| Import format | `helm.catalog.import.v1` |
| Builder | `pnpm dataset:uluwatu:build` |
| Validator | `pnpm dataset:uluwatu:validate` |

---

## Category distribution

Verified entity classifications after final approval audit (not forced to the earlier planning 5/4/3/4 quota):

| Category | Count | Catalog `category` |
|----------|------:|--------------------|
| Restaurants | 6 | `restaurant` |
| Cafes | 3 | `cafe` |
| Attractions | 4 | `attraction` |
| Activities | 3 | `activity` |
| Bars / beach clubs / nightlife | 4 | `beach_club` (3) + `nightlife` (1) |
| Accommodation | 10 | `accommodation` |
| **Total** | **30** | |

Plus **one** draft destination (`uluwatu`).

---

## Geography

Listings retain real Bukit localities — **not** one walking-distance cluster:

- Pecatu  
- Bingin  
- Padang Padang  
- Suluban  
- Ungasan  
- Melasti (destination context)  
- Uluwatu cliffs  

---

## All 30 records (research leads)

### Restaurants (6)

1. The Warung at Alila Villas Uluwatu — `uluwatu-the-warung-alila` — Pecatu  
2. Ulu Garden — `uluwatu-ulu-garden` — Padang Padang / Pecatu  
3. Gooseberry — `uluwatu-gooseberry` — Bingin / Pecatu (French)  
4. Mana — `uluwatu-mana` — Suluban / Uluwatu Surf Villas  
5. Teja Uluwatu — `uluwatu-teja` — Pecatu (live-fire)  
6. Ours Uluwatu — `uluwatu-ours` — Labuansait *(reclassified from cafe → restaurant)*  

### Cafes (3)

7. Suka Espresso — `uluwatu-suka-espresso`  
8. Bambu Cafe — `uluwatu-bambu-cafe` — Bingin  
9. Alchemy Uluwatu — `uluwatu-alchemy` — Bingin  

### Attractions (4)

10. Uluwatu Temple (Pura Luhur Uluwatu) — `uluwatu-pura-luhur` — Pecatu  
11. Padang Padang Beach — `uluwatu-padang-padang-beach` — also Labuan Sait  
12. Suluban Beach (Blue Point) — `uluwatu-suluban-beach`  
13. Green Bowl Beach (Pantai Batu Pageh) — `uluwatu-green-bowl-beach` — Ungasan *(reclassified from activity)*  

### Activities (3)

14. Kecak Dance at Uluwatu Temple — `uluwatu-kecak-dance` — Disparda + Kemlu sources  
15. Surf Lessons Uluwatu — `uluwatu-surf-lessons-uluwatu` — Bingin / Labuansait  
16. Morning Light Yoga — `uluwatu-morning-light-yoga` — Surf Villas campus  

### Bars / beach clubs / nightlife (4)

17. Single Fin — `uluwatu-single-fin` — `beach_club` — Suluban  
18. Sundays Beach Club — `uluwatu-sundays-beach-club` — `beach_club` — Ungasan  
19. Ulu Cliffhouse — `uluwatu-ulu-cliffhouse` — `beach_club`  
20. El Kabron Beach Club — `uluwatu-el-kabron` — `nightlife` — Pecatu / Bingin cliffs  

### Accommodation (10)

21. Radisson Blu Resort & Villas Bali Uluwatu — `uluwatu-radisson-blu` — resort — Pecatu  
22. Nisí Villas — `uluwatu-nisi-villas` — villa — Bingin *(suites not treated as open)*  
23. Grün Uluwatu — `uluwatu-grun` — resort — Pecatu  
24. Alila Villas Uluwatu — `uluwatu-alila-villas` — villa — Pecatu  
25. Uluwatu Surf Villas — `uluwatu-surf-villas` — villa — Suluban  
26. Melali Bingin — `uluwatu-melali-bingin` — boutique_hotel — Bingin  
27. Terra Cottages Bali — `uluwatu-terra-cottages` — boutique_hotel — Bingin  
28. Origin Uluwatu — `uluwatu-origin` — villa — Pecatu  
29. Seascape Resort & Spa Uluwatu by Ini Vie Hospitality — `uluwatu-seascape-resort` — resort — Labuan Sait  
30. Nema. Uluwatu — `uluwatu-nema` — boutique_hotel — Pecatu  

---

## Accommodation data model

### Editorial (source JSON)

Each accommodation record includes an `accommodation` object with staging fields:

- `property_type`  
- `verified_star_classification` (always `null` in v1)  
- `marketplace_star_claim` (always `null` in v1 — OTA stars are not Helm-verified)  
- `guest_rating` / review fields (null until provider + value verified)  
- `price_per_night`, `currency`, `date_checked`  
- `room_categories`, `maximum_occupancy`  
- `private_pool`, `shared_pool` (never conflate property pool with private room pool)  
- `breakfast_inclusion`, `wifi`, `parking`, `air_conditioning`  
- `beach_access`, `verified_distance_to_beaches`  
- `adults_only`, `family_friendly`, `honeymoon_suitability`  
- `official_website`, `booking_url`  

**v1 policy:** unsupported values are `null`. Marketplace nightly rates are **not** written as Helm supplier rates.

### Import (`helm.catalog.import.v1`)

Uses the existing contract only:

```json
{
  "category": "accommodation",
  "accommodation": {
    "accommodationType": "resort | villa | boutique_hotel | guesthouse | hotel | apartment"
  }
}
```

- `starRating` **omitted** (not verified)  
- `amenities` **omitted** (not verified)  
- No invented `priceLevel` for accommodation in v1  

Compatible with `import-format.ts` + `place_accommodation_details`.

---

## Integrity rules (aligned with Ubud v1)

- All records: `draft` + `curated_needs_verification`  
- Destination unpublished  
- Ratings: **null** until both value and provider are verified; import omits `rating` when null  
- Coordinates, addresses, opening hours, booking URLs: null / omitted  
- Visit duration / booking flags: null / omitted  
- Stable keys: editorial `uluwatu-…` → import `id:uluwatu:…`  
- Source provenance via `sources[]`  

### Source coverage (v1, post-audit remediation)

| Kind | Coverage |
|------|----------|
| Official / brand website URL | Most commercial venues including Mana, Bambu Cafe, Alchemy, Surf Lessons Uluwatu, Morning Light Yoga, Melali, Nisí, Terra Cottages, Uluwatu Surf Villas |
| Official tourism / destination listings | Temple, Padang Padang / Labuan Sait, Suluban, Green Bowl (Love Bali / Indonesia Travel / Badung SITA) |
| Manual research lead attribution | Only where no brand/tourism URL is attached |
| Tripadvisor / OTA numeric ratings | **Not included** |
| Confirmed nightly rates | **None** |
| Structured addresses / coords / hours | **All null / omitted** until Helm verification |

### Editorial remediation notes

- Replaced generic **Bukit Peninsula Surf Lesson** → named **Surf Lessons Uluwatu**  
- Replaced packaged **Bingin Beach Day** → named **Morning Light Yoga**  
- Replaced weak-provenance **Lands End Cafe** → **Alchemy Uluwatu**  
- **Ours** reclassified cafe → **restaurant** (brand: all-day restaurant)  
- **Green Bowl** reclassified activity → **attraction** (tourism beach destination)  
- **Kecak** provenance: Disparda Pura Uluwatu + Kemlu Bali Travel Guidebook 2025 (tickets remain null)  
- **Nisí** renamed to **Nisí Villas** (suites still announced as arriving Q3 2026 on brand site)  
- Melali type aligned to `boutique_hotel` per brand positioning

---

## Two-file architecture

| File | Role |
|------|------|
| `uluwatu-curated-v1.source.json` | Rich editorial / staging truth |
| `uluwatu-curated-v1.json` | Strict import payload |

```bash
pnpm dataset:uluwatu:build
pnpm dataset:uluwatu:validate
```

---

## Apply prerequisite

Default `supabase/seed.sql` does **not** include country `ID` or currency `IDR`. Import apply will fail until those exist. This dataset does not change seed/migrations.

---

## Adding records later

1. Edit `scripts/build-uluwatu-dataset-v1.mjs`  
2. Keep unknowns null  
3. Rebuild + validate  
4. Dry-run admin import only after explicit approval  

Do not change OpenAPI / Nest / migrations to fit one record.

---

## Related

- `docs/UBUD_DATASET_V1.md` — pattern reference  
- `docs/CATALOG_IMPORT.md` — import rules  
- `services/helm-backend/src/modules/catalog/domain/import-format.ts` — Zod contract  
