/**
 * Validates Ubud curated dataset v1 (+ accommodation expansion) against editorial
 * rules + helm.catalog.import.v1.
 * Run: pnpm --filter @helm/helm-backend exec node --import tsx scripts/validate-ubud-dataset-v1.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogImport } from "../src/modules/catalog/domain/import-format.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const DIR = join(ROOT, "data/imports/indonesia/ubud");
const SOURCE_PATH = join(DIR, "ubud-curated-v1.source.json");
const IMPORT_PATH = join(DIR, "ubud-curated-v1.json");

const ISO_CURRENCY = new Set(["IDR", "USD", "EUR", "EGP", "TRY", "GEL"]);
const PLACE_CATEGORIES = new Set([
  "accommodation",
  "restaurant",
  "cafe",
  "bar",
  "beach_club",
  "attraction",
  "activity",
  "nightlife",
  "transport",
]);
const ACCOMMODATION_TYPES = new Set([
  "hotel",
  "resort",
  "villa",
  "apartment",
  "guesthouse",
  "boutique_hotel",
]);

const ORIGINAL_20_KEYS = [
  "ubud-hujan-locale",
  "ubud-kubu-at-mandapa",
  "ubud-moksa",
  "ubud-murnis-warung",
  "ubud-aperitif-restaurant",
  "ubud-suka-ubud",
  "ubud-watercress",
  "ubud-ivy-cafe",
  "ubud-gangga-coffee",
  "ubud-sacred-monkey-forest",
  "ubud-campuhan-ridge-walk",
  "ubud-tirta-empul",
  "ubud-mount-batur-sunrise-trek",
  "ubud-atv-quad-bike-adventure",
  "ubud-ayung-river-rafting",
  "ubud-balinese-cooking-class",
  "ubud-donna",
  "ubud-no-mas",
  "ubud-blue-door",
  "ubud-lokal-bar",
] as const;

const failures: string[] = [];
function check(cond: unknown, message: string) {
  if (!cond) failures.push(message);
}

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const source = loadJson(SOURCE_PATH);
const importDoc = loadJson(IMPORT_PATH);

console.log("=== Ubud dataset v1 validation (30-place accommodation expansion) ===");
console.log(`source: ${SOURCE_PATH}`);
console.log(`import: ${IMPORT_PATH}`);
console.log("1. JSON parses successfully: PASS");

const editorialPlaces = source.places ?? [];
const importPlaces = importDoc.places ?? [];
check(editorialPlaces.length === 30, `Expected 30 editorial places, got ${editorialPlaces.length}`);
check(importPlaces.length === 30, `Expected 30 import places, got ${importPlaces.length}`);
console.log(
  `2. Exactly 30 records: editorial=${editorialPlaces.length} import=${importPlaces.length} → ${
    editorialPlaces.length === 30 && importPlaces.length === 30 ? "PASS" : "FAIL"
  }`,
);

const editorialKeys = editorialPlaces.map((p: { external_key: string }) => p.external_key);
const importKeys = importPlaces.map((p: { externalKey: string }) => p.externalKey);
check(new Set(editorialKeys).size === editorialKeys.length, "Duplicate editorial external_key");
check(new Set(importKeys).size === importKeys.length, "Duplicate import externalKey");
console.log(
  `3. Unique external keys: editorial=${new Set(editorialKeys).size} import=${new Set(importKeys).size}`,
);

const catCounts: Record<string, number> = {};
for (const p of editorialPlaces) {
  const bucket =
    p.category === "bar" || p.category === "nightlife"
      ? "bar_nightlife"
      : (p.category as string);
  catCounts[bucket] = (catCounts[bucket] ?? 0) + 1;
}
check(catCounts.restaurant === 5, `restaurant count ${catCounts.restaurant}`);
check(catCounts.cafe === 4, `cafe count ${catCounts.cafe}`);
check(catCounts.attraction === 3, `attraction count ${catCounts.attraction}`);
check(catCounts.activity === 4, `activity count ${catCounts.activity}`);
check(catCounts.bar_nightlife === 4, `bar_nightlife count ${catCounts.bar_nightlife}`);
check(catCounts.accommodation === 10, `accommodation count ${catCounts.accommodation}`);
console.log("4. Category distribution 5/4/3/4/4/10:", catCounts);

for (const key of ORIGINAL_20_KEYS) {
  check(
    editorialKeys.includes(key),
    `Original Ubud V1 key missing from editorial: ${key}`,
  );
}
check(
  editorialKeys.slice(0, 20).join(",") === ORIGINAL_20_KEYS.join(","),
  "Original 20 editorial keys must remain first and in original order",
);

for (const [i, p] of editorialPlaces.entries()) {
  check(typeof p.name === "string" && p.name.trim().length > 0, `places[${i}].name empty`);
  check(PLACE_CATEGORIES.has(p.category), `places[${i}].category unsupported: ${p.category}`);
  check(p.destination_slug === "ubud", `places[${i}].destination_slug != ubud`);
  check(p.country_code === "ID", `places[${i}].country_code != ID`);
  check(p.publication_status === "draft", `places[${i}] not draft`);
  check(
    p.data_status === "curated_needs_verification",
    `places[${i}] data_status != curated_needs_verification`,
  );
  check(p.last_verified_at === null, `places[${i}] last_verified_at must be null`);
  check(
    p.price?.currency == null || ISO_CURRENCY.has(p.price.currency),
    `places[${i}] currency invalid: ${p.price?.currency}`,
  );
  if (p.price?.status === "unknown") {
    check(
      p.price.amount_min === null && p.price.amount_max === null,
      `places[${i}] unknown price amounts must be null`,
    );
  }
  if (p.price?.status === "indicative_not_a_quote") {
    check(p.category === "activity", `places[${i}] indicative prices only expected on activities`);
    check(
      p.price.basis === "indicative_advertised_starting_price",
      `places[${i}] indicative basis missing`,
    );
    check(
      typeof p.price.amount_min === "number" && p.price.amount_min > 0,
      `places[${i}] indicative amount_min must be positive`,
    );
  }
  check(
    p.coordinates?.lat === null && p.coordinates?.lng === null,
    `places[${i}] coordinates must remain null (unknown)`,
  );
  check(p.opening_hours === null, `places[${i}] opening_hours must remain null`);
  check(p.address === null, `places[${i}] address must remain null until verified`);
  check(Array.isArray(p.source_urls), `places[${i}] source_urls missing`);
  check(
    p.visit_duration_minutes === null,
    `places[${i}] visit_duration_minutes must be null until verified`,
  );
  check(
    p.booking_recommended === null,
    `places[${i}] booking_recommended must be null until verified`,
  );

  const hasRatingValue = p.rating && typeof p.rating.value === "number";
  if (hasRatingValue) {
    // Original Ubud V1 cafes/attractions/activities may keep provider=null with
    // scope public_listing_snapshot_provider_unspecified (never invent Tripadvisor).
    check(p.rating.value >= 0 && p.rating.value <= 5, `places[${i}] rating out of 0–5`);
    check(
      Number.isInteger(p.rating.review_count) && p.rating.review_count >= 0,
      `places[${i}] review_count invalid`,
    );
    if (p.rating.provider != null) {
      check(
        String(p.rating.provider).trim().length > 0,
        `places[${i}] rating provider empty string`,
      );
    }
  } else {
    check(p.rating?.value === null, `places[${i}] rating.value should be null when unknown`);
    check(p.rating?.provider === null, `places[${i}] rating.provider should be null when unknown`);
  }

  if (p.category === "accommodation") {
    check(p.accommodation != null, `places[${i}] missing accommodation editorial block`);
    check(
      p.accommodation.price_per_night === null,
      `places[${i}] must not invent accommodation price_per_night`,
    );
    check(
      p.accommodation.verified_star_classification === null,
      `places[${i}] must not claim verified star classification`,
    );
    check(p.accommodation.wifi === null, `places[${i}] wifi must remain null until verified`);
    check(p.accommodation.private_pool === null, `places[${i}] private_pool must remain null`);
    check(p.accommodation.shared_pool === null, `places[${i}] shared_pool must remain null`);
    check(
      Array.isArray(p.source_urls) && p.source_urls.length > 0,
      `places[${i}] accommodation must cite at least one source URL`,
    );
  }
}

for (const [i, p] of importPlaces.entries()) {
  check(typeof p.nameEn === "string" && p.nameEn.trim().length > 0, `import places[${i}].nameEn empty`);
  check(PLACE_CATEGORIES.has(p.category), `import places[${i}] bad category`);
  check(p.destinationSlug === "ubud", `import places[${i}] destinationSlug`);
  check(p.latitude === undefined, `import places[${i}] must omit latitude when unknown`);
  check(p.longitude === undefined, `import places[${i}] must omit longitude when unknown`);
  check(Array.isArray(p.sources) && p.sources.length > 0, `import places[${i}] missing sources`);

  if (p.rating) {
    check(p.rating.value >= 0 && p.rating.value <= 5, `import places[${i}] rating range`);
    check(
      Number.isInteger(p.rating.reviewCount) && p.rating.reviewCount >= 0,
      `import places[${i}] reviewCount`,
    );
    check(
      typeof p.rating.platform === "string" && p.rating.platform.length > 0,
      `import places[${i}] rating missing platform`,
    );
  }

  if (p.category === "activity") {
    check(
      p.priceLevel === undefined,
      `import activity places[${i}] must not set priceLevel from indicative USD ads`,
    );
    check(
      typeof p.descriptionEn === "string" &&
        p.descriptionEn.includes("not a confirmed supplier quote"),
      `import activity places[${i}] must disclose indicative price is not a quote`,
    );
    check(
      p.activity?.typicalDurationMinutes === undefined,
      `import activity places[${i}] must omit unverified typicalDurationMinutes`,
    );
    check(
      p.activity?.bookingRequired === undefined,
      `import activity places[${i}] must omit unverified bookingRequired`,
    );
  }
  if (p.category === "attraction") {
    check(
      p.attraction?.typicalDurationMinutes === undefined,
      `import attraction places[${i}] must omit unverified typicalDurationMinutes`,
    );
    check(
      p.attraction?.bookingRequired === undefined,
      `import attraction places[${i}] must omit unverified bookingRequired`,
    );
  }
  if (p.category === "accommodation") {
    check(p.accommodation != null, `import[${i}] missing accommodation detail block`);
    check(
      ACCOMMODATION_TYPES.has(p.accommodation.accommodationType),
      `import[${i}] invalid accommodationType`,
    );
    check(
      p.accommodation.starRating === undefined,
      `import[${i}] must omit unverified starRating`,
    );
    check(
      p.accommodation.amenities === undefined ||
        (Array.isArray(p.accommodation.amenities) && p.accommodation.amenities.length === 0),
      `import[${i}] must not invent amenities`,
    );
    check(p.priceLevel === undefined, `import[${i}] accommodation must omit invented priceLevel`);
    check(typeof p.websiteUrl === "string" && p.websiteUrl.length > 0, `import[${i}] websiteUrl`);
  }
}

check(
  (importDoc.destinations ?? []).some(
    (d: { slug: string; countryCode: string }) => d.slug === "ubud" && d.countryCode === "ID",
  ),
  "Import missing draft Ubud destination with countryCode ID",
);
check(source.destination?.publication_status === "draft", "Destination must be draft");
check(source.destination?.unpublished === true, "Destination must stay unpublished");

const trip = editorialPlaces.filter(
  (p: { rating: { provider: string | null } }) => p.rating.provider === "Tripadvisor",
);
const biz = editorialPlaces.filter(
  (p: { rating: { provider: string | null } }) =>
    p.rating.provider === "business_listing_snapshot",
);
check(trip.length >= 5, "Expected Tripadvisor-attributed restaurants/bar");
check(biz.length === 3, "Expected 3 business_listing_snapshot nightlife venues");

console.log(
  `5–13. Editorial/import integrity: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}`,
);

const catalogResult = validateCatalogImport(importDoc);
if (!catalogResult.ok) {
  for (const e of catalogResult.errors) {
    failures.push(`catalog:${e.path}: ${e.message}`);
  }
}
console.log(
  `Catalog import schema (helm.catalog.import.v1): ${
    catalogResult.ok ? "PASS" : `FAIL (${catalogResult.errors.length} issues)`
  }`,
);
if (!catalogResult.ok) {
  for (const e of catalogResult.errors.slice(0, 20)) {
    console.log(`  - ${e.path}: ${e.message}`);
  }
}

const byKey = Object.fromEntries(
  editorialPlaces.map((p: { external_key: string }) => [p.external_key, p]),
);
check(byKey["ubud-hujan-locale"].rating.value === 4.5, "Hujan rating drift");
check(byKey["ubud-hujan-locale"].rating.review_count === 1691, "Hujan reviews drift");
check(
  byKey["ubud-sacred-monkey-forest"].rating.review_count === 35730,
  "Monkey Forest reviews drift",
);

// Preservation: original 20 import ratings must not be dropped when editorial
// has a numeric value (provider may be null → platform provider_unspecified).
const EXPECTED_ORIGINAL_IMPORT_RATINGS: Record<
  string,
  { value: number; reviewCount: number; platform: string }
> = {
  "id:ubud:hujan-locale": { value: 4.5, reviewCount: 1691, platform: "Tripadvisor" },
  "id:ubud:kubu-at-mandapa": { value: 4.9, reviewCount: 1489, platform: "Tripadvisor" },
  "id:ubud:moksa": { value: 4.7, reviewCount: 1154, platform: "Tripadvisor" },
  "id:ubud:murnis-warung": { value: 4.3, reviewCount: 1849, platform: "Tripadvisor" },
  "id:ubud:aperitif-restaurant": { value: 4.9, reviewCount: 434, platform: "Tripadvisor" },
  "id:ubud:suka-ubud": { value: 4.8, reviewCount: 511, platform: "provider_unspecified" },
  "id:ubud:watercress": { value: 4.5, reviewCount: 1768, platform: "provider_unspecified" },
  "id:ubud:ivy-cafe": { value: 5, reviewCount: 1996, platform: "provider_unspecified" },
  "id:ubud:gangga-coffee": { value: 4.7, reviewCount: 384, platform: "provider_unspecified" },
  "id:ubud:sacred-monkey-forest": {
    value: 4.2,
    reviewCount: 35730,
    platform: "provider_unspecified",
  },
  "id:ubud:campuhan-ridge-walk": {
    value: 4.3,
    reviewCount: 6789,
    platform: "provider_unspecified",
  },
  "id:ubud:tirta-empul": { value: 4.4, reviewCount: 3644, platform: "provider_unspecified" },
  "id:ubud:mount-batur-sunrise-trek": {
    value: 5,
    reviewCount: 1351,
    platform: "provider_unspecified",
  },
  "id:ubud:atv-quad-bike-adventure": {
    value: 4.9,
    reviewCount: 1995,
    platform: "provider_unspecified",
  },
  "id:ubud:ayung-river-rafting": {
    value: 4.9,
    reviewCount: 615,
    platform: "provider_unspecified",
  },
  "id:ubud:balinese-cooking-class": {
    value: 4.9,
    reviewCount: 396,
    platform: "provider_unspecified",
  },
  "id:ubud:donna": { value: 4.9, reviewCount: 2463, platform: "Tripadvisor" },
  "id:ubud:no-mas": { value: 4.4, reviewCount: 232, platform: "business_listing_snapshot" },
  "id:ubud:blue-door": { value: 4.8, reviewCount: 114, platform: "business_listing_snapshot" },
  "id:ubud:lokal-bar": { value: 4.9, reviewCount: 28, platform: "business_listing_snapshot" },
};
const importByKey = Object.fromEntries(
  importPlaces.map((p: { externalKey: string }) => [p.externalKey, p]),
);
for (const [key, expected] of Object.entries(EXPECTED_ORIGINAL_IMPORT_RATINGS)) {
  const p = importByKey[key];
  check(p != null, `Missing original import place ${key}`);
  check(p?.rating != null, `Original import rating missing for ${key}`);
  check(p?.rating?.value === expected.value, `${key} import rating.value drift`);
  check(p?.rating?.reviewCount === expected.reviewCount, `${key} import reviewCount drift`);
  check(p?.rating?.platform === expected.platform, `${key} import platform drift`);
}
check(byKey["ubud-mount-batur-sunrise-trek"].price.amount_min === 22, "Batur price drift");
check(
  byKey["ubud-mount-batur-sunrise-trek"].price.status === "indicative_not_a_quote",
  "Batur price must remain indicative",
);
check(byKey["ubud-tirta-empul"].area === "Tampaksiring", "Tirta Empul area");
check(byKey["ubud-mount-batur-sunrise-trek"].area === "Kintamani", "Batur area");
check(
  byKey["ubud-ayung-river-rafting"].area.includes("Payangan") ||
    byKey["ubud-ayung-river-rafting"].area.includes("Ayung"),
  "Ayung area",
);

if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(` - ${f}`);
  console.log(`\nRESULT: FAIL (${failures.length} issues)`);
  process.exit(1);
}

console.log("\nCategory counts (editorial):");
console.log(catCounts);
console.log("\nRESULT: PASS");
