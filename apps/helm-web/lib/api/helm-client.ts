import { createHelmClient } from "@helm/api-client-ts";
import { getPublicWebEnv } from "../env";

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
