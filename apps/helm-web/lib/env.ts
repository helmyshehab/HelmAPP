/**
 * Public env for helm-web (traveler). Never read service-role or staff secrets.
 */

export type PublicWebEnv = {
  apiBaseUrl: string;
};

export type TravelerAuthEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function requiredPublic(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing required public environment variable ${name}. Copy apps/helm-web/.env.example to .env.local.`,
    );
  }
  if (/service[_-]?role/i.test(name) || /service[_-]?role/i.test(trimmed)) {
    throw new Error(`${name} must not carry a service-role secret`);
  }
  return trimmed;
}

function assertNoServiceRolePublicValues(
  source: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (value && /service_role|SERVICE_ROLE/i.test(value)) {
      throw new Error(
        `Refusing to load ${key}: value looks like a service-role secret`,
      );
    }
  }
}

/** Validate and return browser-safe public config (API base URL only). */
export function getPublicWebEnv(
  source: Record<string, string | undefined> = process.env,
): PublicWebEnv {
  assertNoServiceRolePublicValues(source);

  const apiBaseUrl = requiredPublic(
    "NEXT_PUBLIC_API_BASE_URL",
    source.NEXT_PUBLIC_API_BASE_URL,
  ).replace(/\/$/, "");

  try {
    // eslint-disable-next-line no-new
    new URL(apiBaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute URL");
  }

  return { apiBaseUrl };
}

/**
 * Supabase anon config for traveler Build sign-in.
 * Required only on Build/login paths — Discover stays API-only.
 */
export function getTravelerAuthEnv(
  source: Record<string, string | undefined> = process.env,
): TravelerAuthEnv {
  assertNoServiceRolePublicValues(source);

  const supabaseUrl = requiredPublic(
    "NEXT_PUBLIC_SUPABASE_URL",
    source.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseAnonKey = requiredPublic(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  try {
    // eslint-disable-next-line no-new
    new URL(supabaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an absolute URL");
  }

  return { supabaseUrl, supabaseAnonKey };
}
