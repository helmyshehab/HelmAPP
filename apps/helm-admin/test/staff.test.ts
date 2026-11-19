import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MeResponse } from "@helm/api-client-ts";
import { isStaffPrincipal, primaryStaffRole } from "../lib/auth/staff";

function me(partial: Partial<MeResponse>): MeResponse {
  return {
    userId: "66666666-6666-6666-6666-666666666666",
    email: "demo.operator@helm.local",
    roles: ["customer"],
    rolesSource: "database",
    ...partial,
  };
}

describe("isStaffPrincipal", () => {
  it("allows database-resolved operator", () => {
    assert.equal(
      isStaffPrincipal(me({ roles: ["customer", "operator"] })),
      true,
    );
  });

  it("allows administrator and super-administrator", () => {
    assert.equal(
      isStaffPrincipal(me({ roles: ["administrator"] })),
      true,
    );
    assert.equal(
      isStaffPrincipal(me({ roles: ["super-administrator"] })),
      true,
    );
  });

  it("denies customer-only even when rolesSource is database", () => {
    assert.equal(isStaffPrincipal(me({ roles: ["customer"] })), false);
  });

  it("fails closed when rolesSource is fallback", () => {
    assert.equal(
      isStaffPrincipal(
        me({ roles: ["operator"], rolesSource: "fallback" }),
      ),
      false,
    );
  });

  it("fails closed on null/empty", () => {
    assert.equal(isStaffPrincipal(null), false);
    assert.equal(isStaffPrincipal(undefined), false);
    assert.equal(isStaffPrincipal(me({ roles: [] })), false);
  });
});

describe("primaryStaffRole", () => {
  it("prefers operator over customer", () => {
    assert.equal(
      primaryStaffRole(me({ roles: ["customer", "operator"] })),
      "operator",
    );
  });

  it("returns null for non-staff", () => {
    assert.equal(primaryStaffRole(me({ roles: ["customer"] })), null);
  });
});
