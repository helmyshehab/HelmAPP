/**
 * Public env for helm-web (traveler). Never read service-role or staff secrets.
 */

export type PublicWebEnv = {
  apiBaseUrl: string;
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

/** Validate and return browser-safe public config (API base URL only). */
export function getPublicWebEnv(
  source: Record<string, string | undefined> = process.env,
): PublicWebEnv {
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (value && /service_role|SERVICE_ROLE/i.test(value)) {
      throw new Error(
        `Refusing to load ${key}: value looks like a service-role secret`,
      );
    }
  }

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
