import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBuildPath,
  isLoginPath,
  loginRedirectUrl,
  safeNextPath,
} from "../lib/auth/paths";

describe("traveler auth paths", () => {
  it("recognizes build and login paths", () => {
    assert.equal(isBuildPath("/build"), true);
    assert.equal(isBuildPath("/build/abc"), true);
    assert.equal(isBuildPath("/"), false);
    assert.equal(isLoginPath("/login"), true);
    assert.equal(isLoginPath("/login/"), true);
  });

  it("defaults next to /build and rejects open redirects", () => {
    assert.equal(safeNextPath(null), "/build");
    assert.equal(safeNextPath("https://evil.example"), "/build");
    assert.equal(safeNextPath("//evil.example"), "/build");
    assert.equal(safeNextPath("/login"), "/build");
    assert.equal(safeNextPath("/build/abc"), "/build/abc");
  });

  it("builds login redirect URLs", () => {
    assert.equal(loginRedirectUrl("/build"), "/login?next=%2Fbuild");
    assert.equal(loginRedirectUrl("/"), "/login");
  });
});
