import { createHelmClient } from "@helm/api-client-ts";
import { getPublicAdminEnv } from "../env";
import { requireAccessToken } from "./access-token";

/**
 * Application wrapper around the generated client.
 * Pass a fresh Supabase access token each call — do not cache tokens in logs.
 */
export function createAuthedHelmClient(accessToken: string) {
  const token = requireAccessToken(accessToken);
  const { apiBaseUrl } = getPublicAdminEnv();
  return createHelmClient({
    baseUrl: apiBaseUrl,
    accessToken: token,
  });
}

export { requireAccessToken } from "./access-token";
