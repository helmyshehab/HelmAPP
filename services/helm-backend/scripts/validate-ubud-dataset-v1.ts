/**
 * Validates Ubud curated dataset v1 against editorial rules + helm.catalog.import.v1.
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

const failures: string[] = [];
function check(cond: unknown, message: string) {
  if (!cond) failures.push(message);
}

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const source = loadJson(SOURCE_PATH);
const importDoc = loadJson(IMPORT_PATH);

console.log("=== Ubud dataset v1 validation ===");
console.log(`source: ${SOURCE_PATH}`);
console.log(`import: ${IMPORT_PATH}`);
console.log("1. JSON parses successfully: PASS");

const editorialPlaces = source.places ?? [];
check(editorialPlaces.length === 20, `Expected 20 editorial places, got ${editorialPlaces.length}`);
check(
  (importDoc.places ?? []).length === 20,
  `Expected 20 import places, got ${(importDoc.places ?? []).length}`,
);
console.log(
  `2. Exactly 20 records: editorial=${editorialPlaces.length} import=${importDoc.places.length} → ${
    editorialPlaces.length === 20 && importDoc.places.length === 20 ? "PASS" : "FAIL"
  }`,
);

const editorialKeys = editorialPlaces.map((p: { external_key: string }) => p.external_key);
const importKeys = importDoc.places.map((p: { externalKey: string }) => p.externalKey);
check(new Set(editorialKeys).size === editorialKeys.length, "Duplicate editorial external_key");
check(new Set(importKeys).size === importKeys.length, "Duplicate import externalKey");
console.log(
  `3. Unique external keys: editorial=${new Set(editorialKeys).size} import=${new Set(importKeys).size}`,
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
    p.rating && p.rating.value >= 0 && p.rating.value <= 5,
    `places[${i}] rating out of 0–5: ${p.rating?.value}`,
  );
  check(
    Number.isInteger(p.rating.review_count) && p.rating.review_count >= 0,
    `places[${i}] review_count invalid`,
  );
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
}

for (const [i, p] of importDoc.places.entries()) {
  check(typeof p.nameEn === "string" && p.nameEn.trim().length > 0, `import places[${i}].nameEn empty`);
  check(PLACE_CATEGORIES.has(p.category), `import places[${i}] bad category`);
  check(p.destinationSlug === "ubud", `import places[${i}] destinationSlug`);
  check(p.latitude === undefined, `import places[${i}] must omit latitude when unknown`);
  check(p.longitude === undefined, `import places[${i}] must omit longitude when unknown`);
  check(Array.isArray(p.sources) && p.sources.length > 0, `import places[${i}] missing sources`);
  check(p.rating != null, `import places[${i}] missing rating`);
  check(p.rating.value >= 0 && p.rating.value <= 5, `import places[${i}] rating range`);
  check(
    Number.isInteger(p.rating.reviewCount) && p.rating.reviewCount >= 0,
    `import places[${i}] reviewCount`,
  );
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
  `4–13. Editorial integrity checks: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}`,
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

const counts: Record<string, number> = {};
for (const p of editorialPlaces) {
  const bucket =
    p.category === "bar" || p.category === "nightlife" ? "bar_nightlife" : p.category;
  counts[bucket] = (counts[bucket] ?? 0) + 1;
}
console.log("\nCategory counts (editorial):");
console.log(counts);
console.log("\nRESULT: PASS");
