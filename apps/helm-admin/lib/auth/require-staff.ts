import { redirect } from "next/navigation";
import type { MeResponse } from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../api/helm-client";
import { createServerSupabaseClient } from "../supabase/server";
import { isStaffPrincipal } from "./staff";
import { bindAccessTokenToVerifiedUser } from "./verified-session";

export type StaffContext = {
  me: MeResponse;
  accessToken: string;
};

/**
 * Server-side staff gate: verified Supabase user + bound access token + Nest /v1/me.
 * Fail closed on any auth or authorization error.
 */
export async function requireStaff(): Promise<StaffContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Token comes from cookie session storage; identity was proven by getUser() above.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const bound = bindAccessTokenToVerifiedUser({ user, session });
  if (!bound.ok) {
    // Inconsistent or incomplete auth state — clear cookies before login.
    await supabase.auth.signOut();
    redirect("/login");
  }

  let me: MeResponse;
  try {
    const client = createAuthedHelmClient(bound.accessToken);
    me = await client.getMe(bound.accessToken);
  } catch {
    // Keep session so staff can recover from a transient API outage via login UI.
    redirect("/login?error=authz_unavailable");
  }

  if (!isStaffPrincipal(me)) {
    await supabase.auth.signOut();
    redirect("/login?error=staff_required");
  }

  // Defense in depth: Nest principal must match the verified Supabase user.
  if (me.userId !== bound.userId) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { me, accessToken: bound.accessToken };
}
