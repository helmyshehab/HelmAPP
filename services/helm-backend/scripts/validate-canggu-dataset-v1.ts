/**
 * Validates Canggu curated dataset v1 (30 places) against editorial rules + helm.catalog.import.v1.
 * Run via: pnpm dataset:canggu:validate
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogImport } from "../src/modules/catalog/domain/import-format.ts";
import { PLACE_CATEGORIES } from "../src/modules/catalog/domain/categories.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const DIR = join(ROOT, "data/imports/indonesia/canggu");
const SOURCE_PATH = join(DIR, "canggu-curated-v1.source.json");
const IMPORT_PATH = join(DIR, "canggu-curated-v1.json");

const ISO_CURRENCY = new Set(["IDR", "USD", "EUR", "EGP", "TRY", "GEL"]);
const PLACE_CATEGORY_SET = new Set(PLACE_CATEGORIES);
const ACCOMMODATION_TYPES = new Set([
  "hotel",
  "resort",
  "villa",
  "apartment",
  "guesthouse",
  "boutique_hotel",
]);

const failures: string[] = [];
function check(cond: unknown, message: string) {
  if (!cond) failures.push(message);
}

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const source = loadJson(SOURCE_PATH);
const importDoc = loadJson(IMPORT_PATH);

console.log("=== Canggu dataset v1 validation ===");
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

const counts: Record<string, number> = {
  restaurant: 0,
  cafe: 0,
  attraction: 0,
  activity: 0,
  bar_beach_club_nightlife: 0,
  accommodation: 0,
};
for (const p of editorialPlaces) {
  if (p.category === "restaurant") counts.restaurant += 1;
  else if (p.category === "cafe") counts.cafe += 1;
  else if (p.category === "attraction") counts.attraction += 1;
  else if (p.category === "activity") counts.activity += 1;
  else if (["bar", "beach_club", "nightlife"].includes(p.category)) {
    counts.bar_beach_club_nightlife += 1;
  } else if (p.category === "accommodation") counts.accommodation += 1;
  else failures.push(`unexpected category ${p.category}`);
}
check(counts.restaurant === 5, `restaurant count ${counts.restaurant} != 5`);
check(counts.cafe === 4, `cafe count ${counts.cafe} != 4`);
check(counts.attraction === 3, `attraction count ${counts.attraction} != 3`);
check(counts.activity === 4, `activity count ${counts.activity} != 4`);
check(
  counts.bar_beach_club_nightlife === 4,
  `bar/beach_club/nightlife count ${counts.bar_beach_club_nightlife} != 4`,
);
check(counts.accommodation === 10, `accommodation count ${counts.accommodation} != 10`);
console.log("4. Category distribution 5/4/3/4/4/10:", counts);

for (const [i, p] of editorialPlaces.entries()) {
  check(typeof p.name === "string" && p.name.trim().length > 0, `places[${i}].name empty`);
  check(PLACE_CATEGORY_SET.has(p.category), `places[${i}].category unsupported: ${p.category}`);
  check(p.destination_slug === "canggu", `places[${i}].destination_slug != canggu`);
  check(p.country_code === "ID", `places[${i}].country_code != ID`);
  check(p.publication_status === "draft", `places[${i}] not draft`);
  check(
    p.data_status === "curated_needs_verification",
    `places[${i}] data_status != curated_needs_verification`,
  );
  check(p.last_verified_at === null, `places[${i}] last_verified_at must be null`);
  check(p.visit_duration_minutes === null, `places[${i}] visit_duration must be null`);
  check(p.booking_recommended === null, `places[${i}] booking_recommended must be null`);
  check(p.opening_hours === null, `places[${i}] opening_hours must be null`);
  check(p.address === null, `places[${i}] address must be null until verified`);
  check(
    p.coordinates?.lat === null && p.coordinates?.lng === null,
    `places[${i}] coordinates must remain null`,
  );
  check(Array.isArray(p.source_urls), `places[${i}] source_urls missing`);
  check(
    Array.isArray(p.source_urls) && p.source_urls.length > 0,
    `places[${i}] must cite at least one source URL`,
  );

  const hasRatingValue = p.rating && typeof p.rating.value === "number";
  if (hasRatingValue) {
    check(p.rating.value >= 0 && p.rating.value <= 5, `places[${i}] rating out of range`);
    check(
      Number.isInteger(p.rating.review_count) && p.rating.review_count >= 0,
      `places[${i}] review_count invalid`,
    );
  } else {
    check(p.rating?.value === null, `places[${i}] rating.value should be null when unknown`);
    check(p.rating?.provider === null, `places[${i}] rating.provider should be null when unknown`);
  }

  check(
    p.price?.currency == null || ISO_CURRENCY.has(p.price.currency),
    `places[${i}] currency invalid`,
  );
  if (p.price?.status === "unknown") {
    check(
      p.price.amount_min === null && p.price.amount_max === null,
      `places[${i}] unknown price amounts must be null`,
    );
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
  }
}

for (const [i, p] of importPlaces.entries()) {
  check(typeof p.nameEn === "string" && p.nameEn.trim().length > 0, `import[${i}] nameEn empty`);
  check(PLACE_CATEGORY_SET.has(p.category), `import[${i}] bad category`);
  check(p.destinationSlug === "canggu", `import[${i}] destinationSlug`);
  check(p.latitude === undefined, `import[${i}] must omit latitude`);
  check(p.longitude === undefined, `import[${i}] must omit longitude`);
  check(Array.isArray(p.sources) && p.sources.length > 0, `import[${i}] missing sources`);

  if (p.rating) {
    check(
      typeof p.rating.platform === "string" && p.rating.platform.length > 0,
      `import[${i}] rating missing platform`,
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

  if (p.category === "attraction") {
    check(p.attraction?.typicalDurationMinutes === undefined, `import[${i}] omit duration`);
    check(p.attraction?.bookingRequired === undefined, `import[${i}] omit bookingRequired`);
  }
  if (p.category === "activity") {
    check(p.activity?.typicalDurationMinutes === undefined, `import[${i}] omit duration`);
    check(p.activity?.bookingRequired === undefined, `import[${i}] omit bookingRequired`);
  }
}

check(
  (importDoc.destinations ?? []).length === 1 &&
    importDoc.destinations[0].slug === "canggu" &&
    importDoc.destinations[0].countryCode === "ID",
  "Exactly one draft Canggu destination with countryCode ID required",
);
check(source.destination?.publication_status === "draft", "Destination must be draft");
check(source.destination?.unpublished === true, "Destination must stay unpublished");

// Tanah Lot must not be smuggled in as a Canggu place.
check(
  !editorialKeys.some((k: string) => k.includes("tanah-lot")),
  "Tanah Lot must not appear as a Canggu place record",
);

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

if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(` - ${f}`);
  console.log(`\nRESULT: FAIL (${failures.length} issues)`);
  process.exit(1);
}

console.log("\nCategory counts (editorial):");
console.log(counts);
console.log("\nRESULT: PASS");
