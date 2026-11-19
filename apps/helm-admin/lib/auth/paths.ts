/**
 * Staff URL paths (route groups like (staff) do not appear in the URL).
 */

const STAFF_PREFIXES = ["/destinations", "/places", "/import"] as const;

export function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** Paths that require a Supabase session (staff shell). */
export function isStaffPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return STAFF_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function loginRedirectUrl(pathname: string, search = ""): string {
  const next = `${pathname}${search}`;
  if (!next || next === "/") {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(next)}`;
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/destinations";
  }
  if (isLoginPath(next)) {
    return "/destinations";
  }
  return next;
}
