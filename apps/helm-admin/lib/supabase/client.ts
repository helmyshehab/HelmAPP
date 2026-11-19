"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicAdminEnv } from "../env";

export function createBrowserSupabaseClient() {
  // Static process.env.NEXT_PUBLIC_* reads so Next can inline values into the
  // browser bundle. Passing process.env as an object skips inlining and makes
  // getPublicAdminEnv() throw before any Auth request.
  const { supabaseUrl, supabaseAnonKey } = getPublicAdminEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
