import type { DestinationPublic } from "@helm/api-client-ts";
import { createPublicHelmClient } from "@/lib/api/helm-client";

/** Max page size allowed by public `listDestinations` (OpenAPI Limit). */
export const GLOBE_PAGE_SIZE = 100;

export type GlobeDestination = DestinationPublic & {
  latitude: number;
  longitude: number;
};

/**
 * Public JSON may encode coordinates as numbers or numeric strings (pg numeric).
 * Reject null/blank/non-numeric values; do not invent coordinates.
 */
export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Keep only published destinations that can be plotted. */
export function withPlottableCoordinates(
  items: DestinationPublic[],
): GlobeDestination[] {
  const plotted: GlobeDestination[] = [];
  for (const item of items) {
    const latitude = parseCoordinate(item.latitude);
    const longitude = parseCoordinate(item.longitude);
    if (latitude === null || longitude === null) continue;
    if (latitude < -90 || latitude > 90) continue;
    if (longitude < -180 || longitude > 180) continue;
    plotted.push({ ...item, latitude, longitude });
  }
  return plotted;
}

/**
 * Load every published destination for the globe, independent of Discover list pagination.
 * Pages `GET /v1/destinations` at limit 100 until `total` is covered.
 */
export async function fetchAllGlobeDestinations(): Promise<GlobeDestination[]> {
  const client = createPublicHelmClient();
  const collected: DestinationPublic[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const result = await client.listDestinations({
      limit: GLOBE_PAGE_SIZE,
      offset,
    });
    const items = result.items ?? [];
    total = typeof result.total === "number" ? result.total : collected.length + items.length;
    collected.push(...items);
    offset += items.length;
    if (items.length === 0) break;
  }

  const seen = new Set<string>();
  const unique: DestinationPublic[] = [];
  for (const item of collected) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }

  return withPlottableCoordinates(unique);
}
