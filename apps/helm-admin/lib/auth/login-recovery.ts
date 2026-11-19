/**
 * Login-page recovery helpers for stuck or denied sessions.
 */

export type LoginErrorCode = "staff_required" | "authz_unavailable" | string;

export function mapLoginError(code: string | null | undefined): string | null {
  if (code === "staff_required") {
    return "This account is not staff. The previous session was cleared — sign in with an operator or administrator account.";
  }
  if (code === "authz_unavailable") {
    return "Could not verify staff authorization with the API. Check that the backend is running with AUTH_PROVIDER=supabase_jwt, then clear the session and retry.";
  }
  if (code === "cleared") {
    return "Session cleared. You can sign in again.";
  }
  return null;
}

/**
 * Offer an explicit session-clear action when a session may still be present
 * (authz_unavailable) or when messaging a prior denial.
 */
export function shouldOfferSessionRecovery(
  code: string | null | undefined,
): boolean {
  return code === "authz_unavailable";
}
