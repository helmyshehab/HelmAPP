import { createHelmClient } from "@helm/api-client-ts";
import { getPublicWebEnv } from "../env";
import { requireAccessToken } from "./access-token";

/**
 * Unauthenticated public catalog client for the traveler app.
 * Do not pass staff tokens or Supabase keys here.
 */
export function createPublicHelmClient() {
  const { apiBaseUrl } = getPublicWebEnv({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  return createHelmClient({
    baseUrl: apiBaseUrl,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        cache: "no-store",
      }),
  });
}

/**
 * Authenticated Helm client for traveler Build (bootstrap + trip drafts).
 * Pass a fresh Supabase access token each call — do not cache tokens in logs.
 */
export function createAuthedHelmClient(accessToken: string) {
  const token = requireAccessToken(accessToken);
  const { apiBaseUrl } = getPublicWebEnv({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });
  return createHelmClient({
    baseUrl: apiBaseUrl,
    accessToken: token,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        cache: "no-store",
      }),
  });
}

export { requireAccessToken } from "./access-token";
