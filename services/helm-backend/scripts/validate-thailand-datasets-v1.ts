/**
 * Essential validation for Thailand catalogue v1 (5 destinations × 30 places).
 * Run via: pnpm dataset:thailand:validate
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogImport } from "../src/modules/catalog/domain/import-format.ts";
import { PLACE_CATEGORIES } from "../src/modules/catalog/domain/categories.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const DEST_SLUGS = ["bangkok", "phuket", "krabi", "koh-phi-phi", "pattaya"] as const;

const PLACE_CATEGORY_SET = new Set(PLACE_CATEGORIES);
const ACCOMMODATION_TYPES = new Set([
  "hotel",
  "resort",
  "villa",
  "apartment",
  "guesthouse",
  "boutique_hotel",
]);
const ISO_CURRENCY = new Set(["THB", "IDR", "USD", "EUR", "EGP", "TRY", "GEL"]);

const failures: string[] = [];
function check(cond: unknown, message: string) {
  if (!cond) failures.push(message);
}

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

console.log("=== Thailand catalogue v1 validation ===");
console.log(`destinations: ${DEST_SLUGS.join(", ")}`);

const allImportKeys = new Set<string>();
const allEditorialKeys = new Set<string>();

for (const slug of DEST_SLUGS) {
  const dir = join(ROOT, "data/imports/thailand", slug);
  const sourcePath = join(dir, `${slug}-curated-v1.source.json`);
  const importPath = join(dir, `${slug}-curated-v1.json`);
  check(existsSync(sourcePath), `${slug}: missing source JSON`);
  check(existsSync(importPath), `${slug}: missing import JSON`);
  if (!existsSync(sourcePath) || !existsSync(importPath)) continue;

  const source = loadJson(sourcePath);
  const importDoc = loadJson(importPath);
  const editorialPlaces = source.places ?? [];
  const importPlaces = importDoc.places ?? [];

  check(editorialPlaces.length === 30, `${slug}: expected 30 editorial places, got ${editorialPlaces.length}`);
  check(importPlaces.length === 30, `${slug}: expected 30 import places, got ${importPlaces.length}`);

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
    else failures.push(`${slug}: unexpected category ${p.category}`);
  }
  check(counts.restaurant === 5, `${slug}: restaurant ${counts.restaurant} != 5`);
  check(counts.cafe === 4, `${slug}: cafe ${counts.cafe} != 4`);
  check(counts.attraction === 3, `${slug}: attraction ${counts.attraction} != 3`);
  check(counts.activity === 4, `${slug}: activity ${counts.activity} != 4`);
  check(
    counts.bar_beach_club_nightlife === 4,
    `${slug}: nightlife bucket ${counts.bar_beach_club_nightlife} != 4`,
  );
  check(counts.accommodation === 10, `${slug}: accommodation ${counts.accommodation} != 10`);

  check(source.destination?.slug === slug, `${slug}: source destination slug mismatch`);
  check(source.destination?.country_code === "TH", `${slug}: country_code must be TH`);
  check(source.destination?.publication_status === "draft", `${slug}: destination must be draft`);
  check(source.destination?.unpublished === true, `${slug}: destination must be unpublished`);
  check(source.country?.currency === "THB", `${slug}: currency must be THB`);

  check(
    (importDoc.destinations ?? []).length === 1 &&
      importDoc.destinations[0].slug === slug &&
      importDoc.destinations[0].countryCode === "TH" &&
      importDoc.destinations[0].updateIfExists === false,
    `${slug}: import destination block invalid`,
  );

  for (const [i, p] of editorialPlaces.entries()) {
    check(p.destination_slug === slug, `${slug} places[${i}] destination_slug`);
    check(p.country_code === "TH", `${slug} places[${i}] country_code`);
    check(p.publication_status === "draft", `${slug} places[${i}] draft`);
    check(p.data_status === "curated_needs_verification", `${slug} places[${i}] data_status`);
    check(PLACE_CATEGORY_SET.has(p.category), `${slug} places[${i}] bad category`);
    check(Array.isArray(p.source_urls) && p.source_urls.length > 0, `${slug} places[${i}] sources`);
    check(p.coordinates?.lat == null && p.coordinates?.lng == null, `${slug} places[${i}] coords`);
    check(p.opening_hours == null, `${slug} places[${i}] opening_hours`);
    check(
      p.price?.currency == null || ISO_CURRENCY.has(p.price.currency),
      `${slug} places[${i}] currency`,
    );
    check(!allEditorialKeys.has(p.external_key), `duplicate editorial key ${p.external_key}`);
    allEditorialKeys.add(p.external_key);
  }

  for (const [i, p] of importPlaces.entries()) {
    check(p.destinationSlug === slug, `${slug} import[${i}] destinationSlug`);
    check(p.updateIfExists === false, `${slug} import[${i}] updateIfExists`);
    check(PLACE_CATEGORY_SET.has(p.category), `${slug} import[${i}] category`);
    check(p.latitude === undefined && p.longitude === undefined, `${slug} import[${i}] no coords`);
    check(Array.isArray(p.sources) && p.sources.length > 0, `${slug} import[${i}] sources`);
    if (p.category === "accommodation") {
      check(
        ACCOMMODATION_TYPES.has(p.accommodation?.accommodationType),
        `${slug} import[${i}] accommodationType`,
      );
      check(p.accommodation?.starRating === undefined, `${slug} import[${i}] no starRating`);
      check(p.priceLevel === undefined, `${slug} import[${i}] no accommodation priceLevel`);
    }
    check(!allImportKeys.has(p.externalKey), `duplicate import key ${p.externalKey}`);
    allImportKeys.add(p.externalKey);
  }

  const catalogResult = validateCatalogImport(importDoc);
  if (!catalogResult.ok) {
    for (const e of catalogResult.errors.slice(0, 10)) {
      failures.push(`${slug} catalog:${e.path}: ${e.message}`);
    }
  }
  console.log(
    `${slug}: places=${importPlaces.length} distribution=${JSON.stringify(counts)} schema=${
      catalogResult.ok ? "PASS" : "FAIL"
    }`,
  );
}

check(DEST_SLUGS.length === 5, "expected 5 destinations");
check(allEditorialKeys.size === 150, `expected 150 unique editorial keys, got ${allEditorialKeys.size}`);
check(allImportKeys.size === 150, `expected 150 unique import keys, got ${allImportKeys.size}`);

if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(` - ${f}`);
  console.log(`\nRESULT: FAIL (${failures.length} issues)`);
  process.exit(1);
}

console.log("\nRESULT: PASS");
console.log("Note: Apply-time prerequisite — geo.countries TH + pricing.currencies THB (not in default seed).");
