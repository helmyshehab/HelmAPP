"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getTravelerAuthEnv } from "../env";

export function createBrowserSupabaseClient() {
  // Static process.env.NEXT_PUBLIC_* reads so Next can inline values into the
  // browser bundle. Passing process.env as an object skips inlining.
  const { supabaseUrl, supabaseAnonKey } = getTravelerAuthEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
