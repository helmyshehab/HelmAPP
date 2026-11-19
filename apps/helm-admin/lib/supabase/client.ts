"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicAdminEnv } from "../env";

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicAdminEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
