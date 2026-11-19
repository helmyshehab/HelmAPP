import assert from "node:assert/strict";
import test from "node:test";
import {
  parseImportPayloadJson,
  payloadFingerprint,
} from "../lib/import/payload-summary.ts";

test("parseImportPayloadJson accepts helm.catalog.import.v1 summary", () => {
  const raw = JSON.stringify({
    formatVersion: "helm.catalog.import.v1",
    sourceLabel: "thailand-bangkok-v1",
    destinations: [
      {
        externalKey: "id:bangkok",
        slug: "bangkok",
        nameEn: "Bangkok",
        nameAr: "بانكوك",
        countryCode: "TH",
      },
    ],
    places: [
      {
        externalKey: "id:bangkok:a",
        destinationSlug: "bangkok",
        category: "restaurant",
        slug: "a",
        nameEn: "A",
        nameAr: "أ",
      },
      {
        externalKey: "id:bangkok:b",
        destinationSlug: "bangkok",
        category: "cafe",
        slug: "b",
        nameEn: "B",
        nameAr: "ب",
      },
    ],
  });

  const parsed = parseImportPayloadJson(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.summary.formatVersion, "helm.catalog.import.v1");
  assert.equal(parsed.summary.sourceLabel, "thailand-bangkok-v1");
  assert.equal(parsed.summary.destinationCount, 1);
  assert.equal(parsed.summary.placeCount, 2);
  assert.deepEqual(parsed.summary.countries, ["TH"]);
  assert.equal(parsed.summary.categoryCounts.restaurant, 1);
  assert.equal(parsed.summary.categoryCounts.cafe, 1);
});

test("parseImportPayloadJson rejects wrong formatVersion", () => {
  const parsed = parseImportPayloadJson(
    JSON.stringify({ formatVersion: "other", destinations: [], places: [] }),
  );
  assert.equal(parsed.ok, false);
});

test("payloadFingerprint normalizes whitespace", () => {
  assert.equal(
    payloadFingerprint('{\n  "a": 1\n}'),
    payloadFingerprint('{ "a": 1 }'),
  );
});
