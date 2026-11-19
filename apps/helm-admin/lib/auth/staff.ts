import type { MeResponse } from "@helm/api-client-ts";

export const STAFF_ROLES = [
  "operator",
  "administrator",
  "super-administrator",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Authoritative staff eligibility from Nest GET /v1/me.
 * Fail closed unless roles were loaded from identity.user_roles.
 */
export function isStaffPrincipal(me: MeResponse | null | undefined): boolean {
  if (!me) return false;
  if (me.rolesSource !== "database") return false;
  if (!Array.isArray(me.roles) || me.roles.length === 0) return false;
  return me.roles.some((role) =>
    (STAFF_ROLES as readonly string[]).includes(role),
  );
}

export function primaryStaffRole(me: MeResponse): StaffRole | null {
  if (!isStaffPrincipal(me)) return null;
  for (const role of STAFF_ROLES) {
    if (me.roles.includes(role)) return role;
  }
  return null;
}
