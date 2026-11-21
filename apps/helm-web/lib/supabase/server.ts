import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getTravelerAuthEnv } from "../env";

/**
 * Server Supabase client bound to Next.js cookies (SSR session).
 * Anon key only — never service-role.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getTravelerAuthEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only;
          // middleware refresh keeps the session alive.
        }
      },
    },
  });
}
