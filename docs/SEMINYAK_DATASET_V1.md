# Helm حلم — Seminyak Curated Travel Catalogue (Dataset v1)

Staging dataset for **Seminyak, Bali, Indonesia**. Exactly **30** curated places for import testing.

**Do not auto-apply to a database. Do not publish. All records remain draft / needs verification.**

| Item | Value |
|------|-------|
| Destination | Seminyak (`seminyak`) |
| Country | Indonesia (`ID`), currency `IDR` |
| Editorial source | `data/imports/indonesia/seminyak/seminyak-curated-v1.source.json` |
| Import-ready payload | `data/imports/indonesia/seminyak/seminyak-curated-v1.json` |
| Import format | `helm.catalog.import.v1` |
| Builder | `pnpm dataset:seminyak:build` |
| Validator | `pnpm dataset:seminyak:validate` |

---

## Geographic note

Seminyak is an **upscale beach and dining strip** north of Legian and Kuta. Records label localities such as **Seminyak Beach**, **Kayu Aya / Oberoi / Eat Street**, **Petitenget**, **Double Six (southern edge)**, and the **Kerobokan Kelod** fringe.

**Do not treat Seminyak, Legian, and Kuta as interchangeable.** Continuous sand does not make the villages the same destination.

Canggu and Uluwatu places are out of scope for this dataset.

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
| La Lucciola | `seminyak-la-lucciola` | Petitenget | lalucciolabali.com |
| Mama San | `seminyak-mama-san` | Kerobokan / Seminyak | mamasanbali.com |
| Barbacoa | `seminyak-barbacoa` | Seminyak | barbacoa-bali.com |
| Ultimo | `seminyak-ultimo` | Kayu Aya | ultimorestaurant.com |
| Motel Mexicola Seminyak | `seminyak-motel-mexicola` | Seminyak | motelmexicola.info/seminyak |

### Cafes

| Name | Key | Area | Source |
|------|-----|------|--------|
| Sisterfields | `seminyak-sisterfields` | Seminyak | sisterfieldsbali.com |
| Revolver Seminyak | `seminyak-revolver` | Kayu Aya | revolverbali.com |
| KYND Seminyak | `seminyak-kynd` | Seminyak | kyndcommunity.com |
| Corner House Bali | `seminyak-corner-house` | Kayu Aya | cornerhousebali.com |

### Attractions

| Name | Key | Area | Notes |
|------|-----|------|-------|
| Pura Petitenget | `seminyak-pura-petitenget` | Petitenget | Working sea temple |
| Petitenget Beach | `seminyak-petitenget-beach` | Petitenget | Natural beach locality |
| Seminyak Beach | `seminyak-seminyak-beach` | Seminyak | Natural beach locality |

### Activities

| Name | Key | Area | Type |
|------|-----|------|------|
| Da Waves Surf School | `seminyak-da-waves-surf` | Double Six | Surf lessons |
| Jiwa Bali Yoga | `seminyak-jiwa-yoga` | Petitenget | Yoga studio |
| Bodyworks Spa | `seminyak-bodyworks-spa` | Petitenget | Day spa |
| Yoga at Desa Potato Head | `seminyak-potato-head-yoga` | Petitenget | Campus yoga |

### Bars / beach clubs / nightlife

| Name | Key | Category | Area |
|------|-----|----------|------|
| Potato Head Beach Club | `seminyak-potato-head-beach-club` | `beach_club` | Petitenget |
| Ku De Ta | `seminyak-ku-de-ta` | `beach_club` | Kayu Aya |
| Woobar Bali | `seminyak-woobar` | `beach_club` | Petitenget |
| Red Carpet Champagne Bar | `seminyak-red-carpet` | `bar` | Kayu Aya |

### Accommodation

Guest ratings, nightly rates, stars, amenities, and pool fields are **null / omitted**. Import maps **`accommodationType` only**.

| Name | Key | Type | Area |
|------|-----|------|------|
| Alila Seminyak | `seminyak-alila-seminyak` | `resort` | Petitenget |
| The Legian Seminyak | `seminyak-the-legian` | `boutique_hotel` | Seminyak Beach |
| W Bali - Seminyak | `seminyak-w-bali` | `resort` | Petitenget |
| Potato Head Suites | `seminyak-potato-head-suites` | `boutique_hotel` | Petitenget |
| The Samaya Seminyak | `seminyak-the-samaya` | `villa` | Seminyak Beach |
| The Oberoi, Bali | `seminyak-oberoi-bali` | `resort` | Seminyak Beach |
| Peppers Seminyak | `seminyak-peppers` | `villa` | Petitenget / Seminyak |
| Hotel Indigo Bali Seminyak Beach | `seminyak-hotel-indigo` | `resort` | Camplung Tanduk |
| The Seminyak Beach Resort & Spa | `seminyak-the-seminyak-beach-resort` | `resort` | Seminyak Beach |
| Amadea Resort & Villas Seminyak | `seminyak-amadea` | `resort` | Kayu Aya |

---

## Integrity rules

- All records: `draft` + `curated_needs_verification`; destination unpublished
- No invented coordinates, opening hours, ratings, amenity inventories, or confirmed prices
- Accommodation import: `accommodationType` only (`hotel` \| `resort` \| `villa` \| `apartment` \| `guesthouse` \| `boutique_hotel`)
- Rebuild: `pnpm dataset:seminyak:build && pnpm dataset:seminyak:validate`

**Apply-time geo prerequisite:** country `ID` and currency `IDR` must exist (not in default seed).
