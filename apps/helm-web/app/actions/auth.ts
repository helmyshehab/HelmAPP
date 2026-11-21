"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

/** Clear the traveler Supabase SSR session and return to Build. */
export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/build");
}
