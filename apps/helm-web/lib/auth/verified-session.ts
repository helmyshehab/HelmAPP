/**
 * Bind a session access token to a user already verified via getUser().
 * getSession() alone is never proof of identity.
 */

export type VerifiedUser = {
  id: string;
};

export type SessionLike = {
  access_token?: string | null;
  user?: { id?: string | null } | null;
} | null;

export type BindAccessTokenResult =
  | { ok: true; userId: string; accessToken: string }
  | {
      ok: false;
      reason:
        | "missing_user"
        | "missing_session"
        | "missing_token"
        | "identity_mismatch";
    };

/**
 * Ensure the cookie session token belongs to the verified Auth user.
 * Fail closed on any missing or inconsistent state.
 */
export function bindAccessTokenToVerifiedUser(input: {
  user: VerifiedUser | null | undefined;
  session: SessionLike | undefined;
}): BindAccessTokenResult {
  if (!input.user?.id) {
    return { ok: false, reason: "missing_user" };
  }
  if (!input.session) {
    return { ok: false, reason: "missing_session" };
  }

  const accessToken = input.session.access_token?.trim() ?? "";
  if (!accessToken) {
    return { ok: false, reason: "missing_token" };
  }

  const sessionUserId = input.session.user?.id?.trim() ?? "";
  if (!sessionUserId || sessionUserId !== input.user.id) {
    return { ok: false, reason: "identity_mismatch" };
  }

  return {
    ok: true,
    userId: input.user.id,
    accessToken,
  };
}
