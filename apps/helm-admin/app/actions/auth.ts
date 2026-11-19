"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

/**
 * Clear the Supabase SSR session cookies and return to a clean login screen.
 */
export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Recovery path for stuck sessions (e.g. authz_unavailable with API down).
 * Clears cookies, then lands on login with a confirmation message — no loop.
 */
export async function clearSessionAndRetryAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login?error=cleared");
}
