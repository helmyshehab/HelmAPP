/**
 * Traveler URL helpers for Build + sign-in.
 */

export function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** Paths that use the traveler session (Build). */
export function isBuildPath(pathname: string): boolean {
  return pathname === "/build" || pathname.startsWith("/build/");
}

export function loginRedirectUrl(pathname: string, search = ""): string {
  const next = `${pathname}${search}`;
  if (!next || next === "/") {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Default post-login landing for travelers. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/build";
  }
  if (isLoginPath(next)) {
    return "/build";
  }
  return next;
}
