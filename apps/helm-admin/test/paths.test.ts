import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLoginPath,
  isStaffPath,
  loginRedirectUrl,
  safeNextPath,
} from "../lib/auth/paths";

describe("staff and login path helpers", () => {
  it("treats /, /destinations, /places, /import as staff paths (not the (staff) folder name)", () => {
    assert.equal(isStaffPath("/"), true);
    assert.equal(isStaffPath("/destinations"), true);
    assert.equal(isStaffPath("/destinations/abc"), true);
    assert.equal(isStaffPath("/places"), true);
    assert.equal(isStaffPath("/places/ubud-sacred-monkey-forest"), true);
    assert.equal(isStaffPath("/import"), true);
    assert.equal(isStaffPath("/import/jobs"), true);
    assert.equal(isStaffPath("/(staff)/destinations"), false);
    assert.equal(isStaffPath("/login"), false);
  });

  it("recognizes login paths", () => {
    assert.equal(isLoginPath("/login"), true);
    assert.equal(isLoginPath("/login/"), true);
    assert.equal(isLoginPath("/destinations"), false);
  });

  it("builds login redirect with next", () => {
    assert.equal(loginRedirectUrl("/"), "/login");
    assert.equal(
      loginRedirectUrl("/destinations", "?q=1"),
      "/login?next=%2Fdestinations%3Fq%3D1",
    );
  });

  it("sanitizes next paths", () => {
    assert.equal(safeNextPath(null), "/destinations");
    assert.equal(safeNextPath("https://evil.example"), "/destinations");
    assert.equal(safeNextPath("//evil.example"), "/destinations");
    assert.equal(safeNextPath("/login"), "/destinations");
    assert.equal(safeNextPath("/import"), "/import");
  });
});
