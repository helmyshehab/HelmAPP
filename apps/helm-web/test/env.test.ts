import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPublicWebEnv, getTravelerAuthEnv } from "../lib/env";

describe("getPublicWebEnv", () => {
  it("returns trimmed API base URL", () => {
    const env = getPublicWebEnv({
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080/",
    });
    assert.equal(env.apiBaseUrl, "http://127.0.0.1:8080");
  });

  it("refuses service-role-looking public values", () => {
    assert.throws(
      () =>
        getPublicWebEnv({
          NEXT_PUBLIC_API_BASE_URL: "eyJservice_role_lookalike",
        }),
      /service-role/,
    );
  });
});

describe("getTravelerAuthEnv", () => {
  it("returns supabase anon config for Build sign-in", () => {
    const env = getTravelerAuthEnv({
      NEXT_PUBLIC_SUPABASE_URL: " http://127.0.0.1:54321 ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    });
    assert.equal(env.supabaseUrl, "http://127.0.0.1:54321");
    assert.equal(env.supabaseAnonKey, "anon-test-key");
  });

  it("fails closed when supabase vars are missing", () => {
    assert.throws(() => getTravelerAuthEnv({}), /NEXT_PUBLIC_SUPABASE_URL/);
  });
});
