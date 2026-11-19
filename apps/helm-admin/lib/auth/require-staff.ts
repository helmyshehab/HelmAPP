import { redirect } from "next/navigation";
import type { MeResponse } from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../api/helm-client";
import { createServerSupabaseClient } from "../supabase/server";
import { isStaffPrincipal } from "./staff";

export type StaffContext = {
  me: MeResponse;
  accessToken: string;
};

/**
 * Server-side staff gate: Supabase session + Nest /v1/me database roles.
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    redirect("/login");
  }

  let me: MeResponse;
  try {
    const client = createAuthedHelmClient(accessToken);
    me = await client.getMe(accessToken);
  } catch {
    // Keep session so the operator can retry when the API is back; login page
    // is allowed to render with ?error= while a session exists.
    redirect("/login?error=authz_unavailable");
  }

  if (!isStaffPrincipal(me)) {
    // Clear non-staff session to avoid middleware bouncing between /login and staff routes.
    await supabase.auth.signOut();
    redirect("/login?error=staff_required");
  }

  return { me, accessToken };
}
