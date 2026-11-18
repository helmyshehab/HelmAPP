# Helm حلم — Catalog JSON import (Step 5)

Canonical format version: `helm.catalog.import.v1`

Curated destination datasets (Bali, Thailand, etc.) import into the **same** catalog schema. There are no country-specific tables.

## Rules

- Validate before mutating (`dryRun: true`).
- Destinations and places require `externalKey` for deterministic deduplication.
- Destination `slug` conflicts with a different `externalKey` are rejected.
- Country codes and optional `citySlug` must resolve to existing `geo` rows.
- Category-specific blocks (`accommodation`, `dining`, …) must match the place `category` or the import is rejected.
- Existing records are **not** overwritten unless `updateIfExists: true`.
- Imports create entries as `draft` — never auto-verified or published.
- Each destination/place write is transactional (row + details + tags + ratings + provenance).
- Record provenance via `sources[]`.
- Do not invent ratings, prices, or verification claims.

## Endpoint

`POST /v1/admin/catalog/import`

- Operators may dry-run.
- Administrators / super-administrators may apply (`dryRun: false`).

## Minimal example

```json
{
  "formatVersion": "helm.catalog.import.v1",
  "sourceLabel": "curated-bali-sample-v1",
  "destinations": [],
  "places": [
    {
      "externalKey": "bali:uluwatu:temple",
      "destinationSlug": "istanbul",
      "category": "attraction",
      "subcategory": "landmark",
      "slug": "sample-uluwatu-temple",
      "nameEn": "Sample Uluwatu Temple",
      "nameAr": "معبد أولوواتو (عينة)",
      "shortDescriptionEn": "Curated sample landmark — not live inventory.",
      "updateIfExists": false,
      "attraction": {
        "attractionType": "landmark",
        "typicalDurationMinutes": 90,
        "bookingRequired": false
      },
      "sources": [
        {
          "sourceType": "manual_research",
          "name": "Helm curated notes",
          "collectedAt": "2026-11-18"
        }
      ]
    }
  ]
}
```

See `docs/examples/catalog-import.sample.json` for a fuller fixture.
