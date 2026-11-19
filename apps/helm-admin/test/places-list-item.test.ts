import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlacePublic } from "@helm/api-client-ts";
import {
  asStaffPlaceListItem,
  mapStaffPlaceListItems,
} from "../lib/places/list-item";

describe("staff place list item mapping", () => {
  it("reads lifecycleStatus from staff list payloads", () => {
    const item = {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "ubud-sacred-monkey-forest",
      nameEn: "Sacred Monkey Forest Sanctuary",
      nameAr: "غابة القرود المقدسة",
      category: "attraction",
      destinationSlug: "ubud",
      lifecycleStatus: "draft",
      status: "published",
    } as PlacePublic & { lifecycleStatus: "draft" };

    const mapped = asStaffPlaceListItem(item);
    assert.ok(mapped);
    assert.equal(mapped.lifecycleStatus, "draft");
    assert.equal(mapped.slug, "ubud-sacred-monkey-forest");
    assert.equal(mapped.destinationSlug, "ubud");
    assert.equal("status" in mapped, false);
  });

  it("drops rows missing a valid lifecycleStatus", () => {
    const items = mapStaffPlaceListItems([
      {
        id: "11111111-1111-1111-1111-111111111111",
        slug: "a",
        nameEn: "A",
        nameAr: "أ",
        category: "attraction",
        status: "published",
      },
    ]);
    assert.deepEqual(items, []);
  });
});
