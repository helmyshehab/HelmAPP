import type { PlaceListResponse, PlacePublic } from "@helm/api-client-ts";
import {
  asStaffPlaceListItem,
  type StaffPlaceListItem,
} from "./list-item";

export const PLACE_SLUG_LOOKUP_PAGE_SIZE = 100;

export type PlaceListPage = Pick<PlaceListResponse, "items" | "total" | "limit" | "offset">;

export type PlaceSlugListClient = {
  adminListCatalogPlaces(params: {
    q: string;
    limit: number;
    offset: number;
  }): Promise<PlaceListPage>;
};

/**
 * Staff list `q` is a substring match (name/slug) with pagination (max 100).
 * An exact slug is not guaranteed on the first page, so walk pages until
 * `item.slug === slug` or the filtered total is exhausted.
 */
export async function resolveStaffPlaceBySlug(
  client: PlaceSlugListClient,
  slug: string,
): Promise<StaffPlaceListItem | null> {
  const target = slug.trim();
  if (!target) return null;

  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await client.adminListCatalogPlaces({
      q: target,
      limit: PLACE_SLUG_LOOKUP_PAGE_SIZE,
      offset,
    });
    total = page.total;
    const match = findExactSlug(page.items, target);
    if (match) return match;

    if (page.items.length === 0) break;
    offset += page.limit > 0 ? page.limit : PLACE_SLUG_LOOKUP_PAGE_SIZE;
    if (offset >= total) break;
  }

  return null;
}

function findExactSlug(
  items: PlacePublic[],
  slug: string,
): StaffPlaceListItem | null {
  for (const item of items) {
    if (item.slug !== slug) continue;
    return asStaffPlaceListItem(item);
  }
  return null;
}
