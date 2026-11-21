import { createAuthedHelmClient } from "../api/helm-client";
import { createServerSupabaseClient } from "../supabase/server";
import { bindAccessTokenToVerifiedUser } from "./verified-session";

export type TravelerContext = {
  userId: string;
  accessToken: string;
};

/**
 * Verified traveler session for Build. Returns null when signed out.
 * Fail closed on inconsistent cookie/session state (clears session).
 */
export async function getTravelerSession(): Promise<TravelerContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const bound = bindAccessTokenToVerifiedUser({ user, session });
  if (!bound.ok) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    userId: bound.userId,
    accessToken: bound.accessToken,
  };
}

/**
 * Bootstrap customer account/profile, then return an authed Helm client.
 * Must run after authentication and before any trip-draft API call.
 */
export async function createBootstrappedTravelerClient(
  accessToken: string,
) {
  const client = createAuthedHelmClient(accessToken);
  await client.bootstrapCustomerProfile(accessToken);
  return client;
}
