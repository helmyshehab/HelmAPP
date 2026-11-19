import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlaceListHref,
  DEFAULT_PAGE_SIZE,
  parsePlaceListSearchParams,
} from "../lib/places/query";

describe("place list query parsing", () => {
  it("applies defaults and clamps pagination", () => {
    const query = parsePlaceListSearchParams({});
    assert.equal(query.limit, DEFAULT_PAGE_SIZE);
    assert.equal(query.offset, 0);
    assert.equal(query.q, undefined);
    assert.equal(query.category, undefined);
  });

  it("parses search and category", () => {
    const query = parsePlaceListSearchParams({
      q: " sacred-monkey ",
      category: "attraction",
      limit: "50",
      offset: "20",
    });
    assert.deepEqual(query, {
      q: "sacred-monkey",
      category: "attraction",
      limit: 50,
      offset: 20,
    });
  });

  it("clamps invalid pagination", () => {
    const query = parsePlaceListSearchParams({
      limit: "999",
      offset: "-5",
    });
    assert.equal(query.limit, 100);
    assert.equal(query.offset, 0);
  });

  it("builds shareable list hrefs", () => {
    const href = buildPlaceListHref(
      {
        q: "ubud-sacred-monkey-forest",
        category: "attraction",
        limit: DEFAULT_PAGE_SIZE,
        offset: 20,
      },
      { offset: 40 },
    );
    assert.equal(
      href,
      "/places?q=ubud-sacred-monkey-forest&category=attraction&offset=40",
    );
  });
});
