/**
 * Client-side summary of helm.catalog.import.v1 for workbench preview.
 * Backend remains authoritative for validation and apply.
 */

export type ImportPayloadSummary = {
  formatVersion: string;
  sourceLabel: string | null;
  destinationCount: number;
  placeCount: number;
  destinations: Array<{
    slug: string;
    nameEn: string;
    countryCode: string;
  }>;
  categoryCounts: Record<string, number>;
  countries: string[];
};

export type ParsePayloadResult =
  | { ok: true; payload: unknown; summary: ImportPayloadSummary }
  | { ok: false; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseImportPayloadJson(raw: string): ParsePayloadResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Paste or upload a catalog import JSON document." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, message: "JSON is not valid. Fix syntax and try again." };
  }

  const root = asRecord(parsed);
  if (!root) {
    return { ok: false, message: "Import document must be a JSON object." };
  }

  const formatVersion =
    typeof root.formatVersion === "string" ? root.formatVersion : "";
  if (formatVersion !== "helm.catalog.import.v1") {
    return {
      ok: false,
      message:
        "Unsupported formatVersion. Expected helm.catalog.import.v1 (existing Helm catalog import contract).",
    };
  }

  const destinations = Array.isArray(root.destinations) ? root.destinations : [];
  const places = Array.isArray(root.places) ? root.places : [];

  const destSummaries: ImportPayloadSummary["destinations"] = [];
  const countries = new Set<string>();
  for (const item of destinations) {
    const dest = asRecord(item);
    if (!dest) continue;
    const slug = typeof dest.slug === "string" ? dest.slug : "";
    const nameEn = typeof dest.nameEn === "string" ? dest.nameEn : slug;
    const countryCode =
      typeof dest.countryCode === "string" ? dest.countryCode.toUpperCase() : "";
    if (countryCode) countries.add(countryCode);
    if (slug) {
      destSummaries.push({ slug, nameEn, countryCode });
    }
  }

  const categoryCounts: Record<string, number> = {};
  for (const item of places) {
    const place = asRecord(item);
    if (!place) continue;
    const category =
      typeof place.category === "string" ? place.category : "unknown";
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    const destSlug =
      typeof place.destinationSlug === "string" ? place.destinationSlug : "";
    // Country may only appear on destinations; still note place destination for display.
    if (destSlug && !destSummaries.some((d) => d.slug === destSlug)) {
      destSummaries.push({
        slug: destSlug,
        nameEn: destSlug,
        countryCode: "",
      });
    }
  }

  return {
    ok: true,
    payload: parsed,
    summary: {
      formatVersion,
      sourceLabel:
        typeof root.sourceLabel === "string" ? root.sourceLabel : null,
      destinationCount: destinations.length,
      placeCount: places.length,
      destinations: destSummaries,
      categoryCounts,
      countries: [...countries].sort(),
    },
  };
}

/** Stable fingerprint so Apply requires matching prior dry-run payload. */
export function payloadFingerprint(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
