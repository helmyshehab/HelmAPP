import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePlaceApiError } from "../lib/places/errors";

describe("place API error mapping", () => {
  it("maps generated-client status failures", () => {
    assert.equal(
      parsePlaceApiError(
        new Error("/v1/admin/catalog/places failed: 403"),
      ).kind,
      "forbidden",
    );
    assert.equal(
      parsePlaceApiError(new Error("transition failed: 409")).kind,
      "conflict",
    );
    assert.equal(
      parsePlaceApiError(new Error("list failed: 404")).message,
      "Place not found.",
    );
  });

  it("fails closed on unknown errors", () => {
    const parsed = parsePlaceApiError("boom");
    assert.equal(parsed.kind, "unknown");
    assert.equal(parsed.status, null);
  });
});
