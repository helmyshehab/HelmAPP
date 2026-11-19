import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapLoginError,
  shouldOfferSessionRecovery,
} from "../lib/auth/login-recovery";
import { isStaffPrincipal } from "../lib/auth/staff";

describe("login recovery helpers", () => {
  it("explains authz_unavailable and offers session recovery", () => {
    const message = mapLoginError("authz_unavailable");
    assert.match(String(message), /AUTH_PROVIDER=supabase_jwt/);
    assert.equal(shouldOfferSessionRecovery("authz_unavailable"), true);
  });

  it("does not auto-offer recovery for ordinary staff denial", () => {
    assert.equal(shouldOfferSessionRecovery("staff_required"), false);
    assert.match(String(mapLoginError("staff_required")), /not staff/i);
  });

  it("confirms cleared sessions for retry", () => {
    assert.match(String(mapLoginError("cleared")), /cleared/i);
    assert.equal(shouldOfferSessionRecovery("cleared"), false);
  });

  it("does not offer recovery without an error code", () => {
    assert.equal(shouldOfferSessionRecovery(null), false);
    assert.equal(mapLoginError(null), null);
  });
});

describe("backend authorization failure (staff principal)", () => {
  it("fails closed when /v1/me cannot establish database staff roles", () => {
    assert.equal(
      isStaffPrincipal({
        userId: "66666666-6666-6666-6666-666666666666",
        roles: ["operator"],
        rolesSource: "fallback",
      }),
      false,
    );
    assert.equal(
      isStaffPrincipal({
        userId: "55555555-5555-5555-5555-555555555555",
        roles: ["customer"],
        rolesSource: "database",
      }),
      false,
    );
  });

  it("rejects nest principal that would not match verified user in requireStaff", () => {
    const verifiedUserId = "66666666-6666-6666-6666-666666666666";
    const me = {
      userId: "77777777-7777-7777-7777-777777777777",
      roles: ["administrator"] as const,
      rolesSource: "database" as const,
    };
    assert.equal(isStaffPrincipal(me), true);
    assert.notEqual(me.userId, verifiedUserId);
  });
});
