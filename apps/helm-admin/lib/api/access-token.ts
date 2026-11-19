/** Normalize a Bearer access token; never log the return value. */
export function requireAccessToken(accessToken: string): string {
  const token = accessToken.trim();
  if (!token) {
    throw new Error("accessToken is required");
  }
  return token;
}
