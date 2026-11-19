# Helm حلم — Canggu Curated Travel Catalogue (Dataset v1)

Staging dataset for **Canggu, Bali, Indonesia**. Exactly **30** curated places for import testing.

**Do not auto-apply to a database. Do not publish. All records remain draft / needs verification.**

| Item | Value |
|------|-------|
| Destination | Canggu (`canggu`) |
| Country | Indonesia (`ID`), currency `IDR` |
| Editorial source | `data/imports/indonesia/canggu/canggu-curated-v1.source.json` |
| Import-ready payload | `data/imports/indonesia/canggu/canggu-curated-v1.json` |
| Import format | `helm.catalog.import.v1` |
| Builder | `pnpm dataset:canggu:build` |
| Validator | `pnpm dataset:canggu:validate` |

---

## Geographic note

Canggu is a **coastal strip**, not one uniformly walkable village. Records label actual localities such as **Berawa**, **Batu Bolong**, **Echo Beach (Batu Mejan)**, **Pererenan**, and **Tibubeneng / Nelayan**. Do not treat distant clusters as walking-distance equivalents.

**Tanah Lot (Tabanan)** is outside this destination dataset and is not included as a Canggu place.

---

## Category distribution

| Category | Count | Catalog `category` values |
|----------|------:|---------------------------|
| Restaurants | 5 | `restaurant` |
| Cafes | 4 | `cafe` |
| Attractions | 3 | `attraction` |
| Activities | 4 | `activity` |
| Bars / beach clubs / nightlife | 4 | `bar` (1) + `beach_club` (3) |
| Accommodation | 10 | `accommodation` |
| **Total** | **30** | |

---

## All 30 records

### Restaurants

| Name | Key | Area | Source |
|------|-----|------|--------|
| Billy Ho | `canggu-billy-ho` | Batu Bolong | billyho.co |
| Sazón | `canggu-sazon` | Batu Bolong | sazonbali.com |
| MASONRY. Canggu | `canggu-masonry` | Batu Bolong | masonrybali.com |
| Zai Cafe | `canggu-zai-cafe` | Batu Bolong | cafezai.com |
| Deus Cafe | `canggu-deus-cafe` | Echo Beach | deuscustoms.co.id |

### Cafes

| Name | Key | Area | Source |
|------|-----|------|--------|
| Milk & Madu Beach Road | `canggu-milk-madu-beach-road` | Batu Bolong | milkandmadu.com |
| Milk & Madu Berawa | `canggu-milk-madu-berawa` | Berawa | milkandmadu.com |
| Crate Cafe | `canggu-crate-cafe` | Pererenan | lifescrate.com |
| House of Sunday | `canggu-house-of-sunday` | Batu Bolong | house-of-sunday.com |

### Attractions

| Name | Key | Area | Notes |
|------|-----|------|-------|
| Pura Batu Bolong | `canggu-pura-batu-bolong` | Batu Bolong | Working sea temple (not Tanah Lot’s Batu Bolong) |
| Echo Beach | `canggu-echo-beach` | Echo Beach | Natural beach locality |
| Berawa Beach | `canggu-berawa-beach` | Berawa | Natural beach locality |

### Activities

| Name | Key | Area | Type |
|------|-----|------|------|
| Turtle Surf School Bali | `canggu-turtle-surf-school` | Batu Bolong | Surf lessons |
| Bali Surf School (SURFISUPBALI) | `canggu-bali-surf-school` | Canggu | Surf lessons |
| The Practice | `canggu-the-practice-yoga` | Batu Bolong | Yoga studio |
| Serenity Yoga Canggu | `canggu-serenity-yoga` | Nelayan / Canggu | Yoga studio |

### Bars / beach clubs / nightlife

| Name | Key | Category | Area |
|------|-----|----------|------|
| La Brisa Bali | `canggu-la-brisa` | `beach_club` | Echo Beach |
| FINNS Beach Club | `canggu-finns-beach-club` | `beach_club` | Berawa |
| Old Man's | `canggu-old-mans` | `bar` | Batu Bolong |
| Atlas Beach Club | `canggu-atlas-beach-club` | `beach_club` | Berawa / Tibubeneng |

### Accommodation

Guest ratings, nightly rates, stars, amenities, and pool fields are **null / omitted**. Import maps **`accommodationType` only**.

| Name | Key | Type | Area |
|------|-----|------|------|
| COMO Canggu | `canggu-como-canggu` | `resort` | Echo Beach |
| Hotel Tugu Bali | `canggu-hotel-tugu` | `boutique_hotel` | Batu Bolong |
| The Slow | `canggu-the-slow` | `boutique_hotel` | Batu Bolong |
| Masmara Resort | `canggu-masmara-resort` | `resort` | Pererenan |
| Kayu Village Resort | `canggu-kayu-village` | `boutique_hotel` | Pererenan |
| Further Hotel | `canggu-further-hotel` | `boutique_hotel` | Pererenan |
| Ivy Canggu | `canggu-ivy-canggu` | `boutique_hotel` | Pererenan |
| White Goose Boutique Hotel | `canggu-white-goose` | `boutique_hotel` | Berawa |
| Solaya Villas | `canggu-solaya-villas` | `villa` | Canggu |
| ZIN Canggu Resort & Villas | `canggu-zin-canggu` | `resort` | Nelayan / Canggu |

---

## Integrity rules

- All records: `draft` + `curated_needs_verification`; destination unpublished
- No invented coordinates, opening hours, ratings, amenity inventories, or confirmed prices
- Accommodation import: `accommodationType` only (`hotel` \| `resort` \| `villa` \| `apartment` \| `guesthouse` \| `boutique_hotel`)
- Rebuild: `pnpm dataset:canggu:build && pnpm dataset:canggu:validate`

**Apply-time geo prerequisite:** country `ID` and currency `IDR` must exist (not in default seed).
