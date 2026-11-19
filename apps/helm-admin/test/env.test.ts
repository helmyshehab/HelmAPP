import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPublicAdminEnv } from "../lib/env";

describe("getPublicAdminEnv", () => {
  it("returns trimmed public config", () => {
    const env = getPublicAdminEnv({
      NEXT_PUBLIC_SUPABASE_URL: " http://127.0.0.1:54321 ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080/",
    });
    assert.equal(env.supabaseUrl, "http://127.0.0.1:54321");
    assert.equal(env.supabaseAnonKey, "anon-test-key");
    assert.equal(env.apiBaseUrl, "http://127.0.0.1:8080");
  });

  it("fails closed when public vars are missing", () => {
    assert.throws(
      () => getPublicAdminEnv({}),
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("refuses service-role-looking public values", () => {
    assert.throws(
      () =>
        getPublicAdminEnv({
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJservice_role_lookalike",
          NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080",
        }),
      /service-role/,
    );
  });
});
