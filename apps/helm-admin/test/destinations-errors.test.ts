import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isConflictError, parseApiError } from "../lib/destinations/errors";

describe("destination API error mapping", () => {
  it("maps generated-client status failures", () => {
    assert.equal(
      parseApiError(new Error("/v1/admin/catalog/destinations failed: 403"))
        .kind,
      "forbidden",
    );
    assert.equal(
      parseApiError(new Error("transition failed: 409")).kind,
      "conflict",
    );
    assert.equal(
      parseApiError(new Error("create failed: 400")).kind,
      "bad_request",
    );
  });

  it("detects HTTP 409 conflicts for refresh UX", () => {
    assert.equal(
      isConflictError(new Error("/v1/.../transition failed: 409")),
      true,
    );
    assert.equal(
      isConflictError(new Error("/v1/.../transition failed: 400")),
      false,
    );
  });

  it("fails closed on unknown errors", () => {
    const parsed = parseApiError("boom");
    assert.equal(parsed.kind, "unknown");
    assert.equal(parsed.status, null);
  });
});
