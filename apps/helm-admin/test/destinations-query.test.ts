import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDestinationListHref,
  DEFAULT_PAGE_SIZE,
  parseDestinationListSearchParams,
} from "../lib/destinations/query";

describe("destination list query parsing", () => {
  it("applies defaults and clamps pagination", () => {
    const query = parseDestinationListSearchParams({});
    assert.equal(query.limit, DEFAULT_PAGE_SIZE);
    assert.equal(query.offset, 0);
    assert.equal(query.q, undefined);
  });

  it("parses search, single lifecycle, country, and flags", () => {
    const query = parseDestinationListSearchParams({
      q: " bali ",
      lifecycleStatus: "draft",
      country: "id",
      featured: "true",
      topLevelOnly: "true",
      limit: "50",
      offset: "20",
    });
    assert.deepEqual(query, {
      q: "bali",
      lifecycleStatus: "draft",
      country: "ID",
      featured: true,
      topLevelOnly: true,
      limit: 50,
      offset: 20,
    });
  });

  it("ignores invalid lifecycle and country values", () => {
    const query = parseDestinationListSearchParams({
      lifecycleStatus: "nope",
      country: "EGYPT",
      limit: "999",
      offset: "-5",
    });
    assert.equal(query.lifecycleStatus, undefined);
    assert.equal(query.country, undefined);
    assert.equal(query.limit, 100);
    assert.equal(query.offset, 0);
  });

  it("builds shareable list hrefs without inventing sort params", () => {
    const href = buildDestinationListHref(
      {
        q: "ubud",
        country: "ID",
        lifecycleStatus: "published",
        featured: true,
        topLevelOnly: undefined,
        limit: DEFAULT_PAGE_SIZE,
        offset: 20,
      },
      { offset: 40 },
    );
    assert.equal(
      href,
      "/destinations?q=ubud&country=ID&lifecycleStatus=published&featured=true&offset=40",
    );
    assert.equal(href.includes("sort="), false);
  });
});
