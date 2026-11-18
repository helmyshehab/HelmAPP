export const APP_ROLES = [
  'customer',
  'operator',
  'administrator',
  'super-administrator',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthPrincipal = {
  userId: string;
  email?: string;
  roles: AppRole[];
  /** Where roles were resolved from — JWT claims are never authoritative for staff. */
  rolesSource: 'database' | 'fallback';
  tokenUse?: string;
};

/**
 * AuthPort — verify caller identity without coupling domain code to Supabase SDK.
 * Implementations live under infrastructure/adapters.
 */
export interface AuthPort {
  verifyAccessToken(accessToken: string): Promise<AuthPrincipal>;
}

export const AUTH_PORT = Symbol('AUTH_PORT');
