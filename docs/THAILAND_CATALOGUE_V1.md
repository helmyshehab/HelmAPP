# Helm حلم — Thailand Catalogue Foundation (V1)

Country-level Thailand catalogue foundation with **five** independent destination datasets for staging import under `helm.catalog.import.v1`.

**Do not auto-apply to a database. Do not publish. All records remain draft / needs verification.**

Detailed business-by-business editorial curation is deferred to **Helm Admin**. This pass prioritises reusable pipeline architecture and importable staging inventories.

| Item | Value |
|------|-------|
| Country | Thailand (`TH`), currency `THB` |
| Destinations | Bangkok, Phuket, Krabi, Koh Phi Phi, Pattaya |
| Places per destination | **30** (5/4/3/4/4/10) |
| Total places | **150** |
| Import format | `helm.catalog.import.v1` |
| Builder | `pnpm dataset:thailand:build` |
| Validator | `pnpm dataset:thailand:validate` |

---

## Apply-time prerequisite (blocker for DB import)

Default `supabase/seed.sql` does **not** include:

- `pricing.currencies` → `THB`
- `geo.countries` → `TH`

Same class of prerequisite as Bali/`IDR`. **Do not apply Thailand imports until TH/THB exist.** This dataset pass does not modify seeds, migrations, or schema.

---

## Layout

```text
data/imports/thailand/
  bangkok/bangkok-curated-v1.{source.json,json}
  phuket/phuket-curated-v1.{source.json,json}
  krabi/krabi-curated-v1.{source.json,json}
  koh-phi-phi/koh-phi-phi-curated-v1.{source.json,json}
  pattaya/pattaya-curated-v1.{source.json,json}

scripts/lib/thailand-catalog-v1.mjs          # shared expander/builder
scripts/data/thailand-v1-destinations.mjs    # compact place definitions
scripts/build-thailand-datasets-v1.mjs
scripts/validate-thailand-datasets-v1.mjs
services/helm-backend/scripts/validate-thailand-datasets-v1.ts
```

Each destination import file is **self-contained** (one destination + 30 places) and can be dry-run/applied independently once TH/THB exist.

---

## Category distribution (per destination)

| Category | Count |
|----------|------:|
| restaurant | 5 |
| cafe | 4 |
| attraction | 3 |
| activity | 4 |
| bar / beach_club / nightlife | 4 |
| accommodation | 10 |
| **Total** | **30** |

---

## Geography notes

| Destination | Keep distinct from |
|-------------|--------------------|
| Bangkok | Pattaya; district clusters not one walkable city |
| Phuket | Krabi lodging; Koh Phi Phi lodging; Patong ≠ Bang Tao |
| Krabi | Phuket; Phi Phi lodging (day trips ≠ stay inventory) |
| Koh Phi Phi | Krabi mainland; Phuket; Maya Bay is day-visit oriented |
| Pattaya | Bangkok; Jomtien / Wongamat / Walking Street labeled |

---

## Integrity

- All destinations/places: draft, unpublished, `updateIfExists: false`
- No invented ratings, prices, coordinates, opening hours, amenities, or star ratings
- Accommodation import: `accommodationType` only
- Cross-destination external keys are unique (150)
- Bali datasets untouched

---

## Rebuild

```bash
pnpm dataset:thailand:build
pnpm dataset:thailand:validate
```
