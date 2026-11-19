import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlacePublic } from "@helm/api-client-ts";
import {
  PLACE_SLUG_LOOKUP_PAGE_SIZE,
  resolveStaffPlaceBySlug,
  type PlaceSlugListClient,
} from "../lib/places/resolve-by-slug";

function place(
  slug: string,
  lifecycleStatus: string,
): PlacePublic & { lifecycleStatus: string } {
  return {
    id: `11111111-1111-1111-1111-${slug.padEnd(12, "0").slice(0, 12)}`,
    slug,
    nameEn: slug,
    nameAr: slug,
    category: "attraction",
    status: "published",
    lifecycleStatus,
  };
}

describe("resolveStaffPlaceBySlug", () => {
  it("does not assume the exact slug is on the first page", async () => {
    const target = place("ubud-sacred-monkey-forest", "draft");
    const filler = Array.from({ length: PLACE_SLUG_LOOKUP_PAGE_SIZE }, (_, i) =>
      place(`ubud-sacred-monkey-forest-extra-${i}`, "draft"),
    );

    const calls: Array<{ limit: number; offset: number }> = [];
    const client: PlaceSlugListClient = {
      async adminListCatalogPlaces({ limit, offset }) {
        calls.push({ limit, offset });
        const all = [...filler, target];
        return {
          items: all.slice(offset, offset + limit),
          total: all.length,
          limit,
          offset,
        };
      },
    };

    const found = await resolveStaffPlaceBySlug(
      client,
      "ubud-sacred-monkey-forest",
    );
    assert.ok(found);
    assert.equal(found.slug, "ubud-sacred-monkey-forest");
    assert.equal(found.lifecycleStatus, "draft");
    assert.deepEqual(calls, [
      { limit: PLACE_SLUG_LOOKUP_PAGE_SIZE, offset: 0 },
      { limit: PLACE_SLUG_LOOKUP_PAGE_SIZE, offset: PLACE_SLUG_LOOKUP_PAGE_SIZE },
    ]);
  });

  it("returns null when no exact slug match exists", async () => {
    const client: PlaceSlugListClient = {
      async adminListCatalogPlaces({ limit, offset }) {
        return {
          items: [place("ubud-other", "draft")],
          total: 1,
          limit,
          offset,
        };
      },
    };
    const found = await resolveStaffPlaceBySlug(
      client,
      "ubud-sacred-monkey-forest",
    );
    assert.equal(found, null);
  });
});
