import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireAccessToken } from "../lib/api/access-token";

describe("requireAccessToken", () => {
  it("requires a non-empty access token", () => {
    assert.throws(() => requireAccessToken(""), /accessToken is required/);
    assert.throws(() => requireAccessToken("   "), /accessToken is required/);
  });

  it("returns trimmed tokens", () => {
    assert.equal(requireAccessToken("  abc.def  "), "abc.def");
  });
});
