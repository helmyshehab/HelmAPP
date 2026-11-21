import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bindAccessTokenToVerifiedUser } from "../lib/auth/verified-session";

const USER = { id: "66666666-6666-6666-6666-666666666666" };

describe("bindAccessTokenToVerifiedUser", () => {
  it("accepts a matching verified user and session token", () => {
    const result = bindAccessTokenToVerifiedUser({
      user: USER,
      session: {
        access_token: "  access.token.value  ",
        user: { id: USER.id },
      },
    });
    assert.deepEqual(result, {
      ok: true,
      userId: USER.id,
      accessToken: "access.token.value",
    });
  });

  it("rejects missing or mismatched identity", () => {
    assert.deepEqual(
      bindAccessTokenToVerifiedUser({
        user: null,
        session: { access_token: "token", user: { id: USER.id } },
      }),
      { ok: false, reason: "missing_user" },
    );
    assert.deepEqual(
      bindAccessTokenToVerifiedUser({
        user: USER,
        session: {
          access_token: "token",
          user: { id: "77777777-7777-7777-7777-777777777777" },
        },
      }),
      { ok: false, reason: "identity_mismatch" },
    );
  });
});
