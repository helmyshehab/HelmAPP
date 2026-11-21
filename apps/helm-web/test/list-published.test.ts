import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DestinationPublic } from "@helm/api-client-ts";
import {
  PUBLISHED_DESTINATION_PAGE_SIZE,
  destinationCatalogStatusMessage,
  destinationPickerLabel,
  listAllPublishedDestinations,
  toDestinationPickerOptions,
} from "../lib/destinations/list-published";

function destination(
  id: string,
  nameEn: string,
  slug = nameEn.toLowerCase(),
): DestinationPublic {
  return {
    id,
    slug,
    nameEn,
    nameAr: nameEn,
    countryCode: "ID",
    isFeatured: false,
    tags: [],
    status: "published",
  };
}

describe("listAllPublishedDestinations", () => {
  it("pages beyond the first catalog page", async () => {
    const page1 = Array.from({ length: PUBLISHED_DESTINATION_PAGE_SIZE }, (_, i) =>
      destination(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, `D${i}`),
    );
    const page2 = [destination("99999999-9999-4999-8999-999999999999", "Beyond")];
    const calls: Array<{ limit?: number; offset?: number }> = [];

    const items = await listAllPublishedDestinations({
      async listDestinations(params) {
        calls.push(params ?? {});
        const offset = params?.offset ?? 0;
        if (offset === 0) {
          return {
            items: page1,
            total: page1.length + page2.length,
            limit: PUBLISHED_DESTINATION_PAGE_SIZE,
            offset: 0,
          };
        }
        return {
          items: page2,
          total: page1.length + page2.length,
          limit: PUBLISHED_DESTINATION_PAGE_SIZE,
          offset,
        };
      },
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[1]?.offset, PUBLISHED_DESTINATION_PAGE_SIZE);
    assert.equal(items.length, page1.length + page2.length);
    assert.equal(items.at(-1)?.nameEn, "Beyond");
  });
});

describe("destination picker labels and status", () => {
  it("uses destination names for options", () => {
    const options = toDestinationPickerOptions([
      destination("11111111-1111-4111-8111-111111111111", "Ubud"),
    ]);
    assert.deepEqual(options, [
      { id: "11111111-1111-4111-8111-111111111111", label: "Ubud" },
    ]);
    assert.equal(
      destinationPickerLabel({ nameEn: "   ", slug: "ubud" }),
      "ubud",
    );
  });

  it("reports when a saved destination is no longer published", () => {
    const message = destinationCatalogStatusMessage({
      savedDestinationId: "22222222-2222-4222-8222-222222222222",
      catalog: {
        ok: true,
        options: [
          { id: "11111111-1111-4111-8111-111111111111", label: "Ubud" },
        ],
      },
    });
    assert.match(message ?? "", /no longer published/i);
  });

  it("reports when the catalog fails to load", () => {
    const message = destinationCatalogStatusMessage({
      savedDestinationId: "22222222-2222-4222-8222-222222222222",
      catalog: { ok: false, message: "network down" },
    });
    assert.match(message ?? "", /catalog unavailable/i);
    assert.match(message ?? "", /network down/);
  });
});
