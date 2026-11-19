/**
 * Public env for helm-admin. Never read service-role or DATABASE_URL here.
 */

export type PublicAdminEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
};

function requiredPublic(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing required public environment variable ${name}. Copy .env.example and set local Supabase anon values.`,
    );
  }
  if (/service[_-]?role/i.test(name) || /service[_-]?role/i.test(trimmed)) {
    throw new Error(`${name} must not carry a service-role secret`);
  }
  return trimmed;
}

/** Validate and return browser-safe public config. */
export function getPublicAdminEnv(
  source: Record<string, string | undefined> = process.env,
): PublicAdminEnv {
  // Refuse privileged keys if somehow present under public names.
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (value && /service_role|SERVICE_ROLE/i.test(value)) {
      throw new Error(
        `Refusing to load ${key}: value looks like a service-role secret`,
      );
    }
  }

  const supabaseUrl = requiredPublic(
    "NEXT_PUBLIC_SUPABASE_URL",
    source.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseAnonKey = requiredPublic(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const apiBaseUrl = requiredPublic(
    "NEXT_PUBLIC_API_BASE_URL",
    source.NEXT_PUBLIC_API_BASE_URL,
  ).replace(/\/$/, "");

  try {
    // eslint-disable-next-line no-new
    new URL(supabaseUrl);
    // eslint-disable-next-line no-new
    new URL(apiBaseUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_API_BASE_URL must be absolute URLs",
    );
  }

  return { supabaseUrl, supabaseAnonKey, apiBaseUrl };
}
