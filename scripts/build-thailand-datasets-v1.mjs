#!/usr/bin/env node
/**
 * Builds all Thailand V1 curated destination datasets (5 × 30 places).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDestinationDataset } from "./lib/thailand-catalog-v1.mjs";
import { THAILAND_DESTINATIONS } from "./data/thailand-v1-destinations.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let total = 0;
for (const dest of THAILAND_DESTINATIONS) {
  const result = buildDestinationDataset(dest, ROOT);
  total += result.placeCount;
  console.log(
    `Wrote ${dest.slug}: ${result.placeCount} places → ${result.importPath}`,
  );
  console.log(`  counts: ${JSON.stringify(result.counts)}`);
}
console.log(`Done. Destinations: ${THAILAND_DESTINATIONS.length}, places: ${total}`);
