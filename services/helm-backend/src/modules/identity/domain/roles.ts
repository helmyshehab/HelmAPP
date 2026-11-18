import type { AppRole } from '../../../infrastructure/ports/auth.port';

/** Staff roles that grant elevated access (customer is implicit for authenticated users). */
export const STAFF_ROLES: readonly AppRole[] = [
  'operator',
  'administrator',
  'super-administrator',
] as const;

export function hasAnyRole(owned: readonly AppRole[], required: readonly AppRole[]): boolean {
  return required.some((role) => owned.includes(role));
}
