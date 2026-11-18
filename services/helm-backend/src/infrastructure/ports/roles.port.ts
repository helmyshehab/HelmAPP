import type { AppRole } from './auth.port';

/**
 * RolesPort — database-managed authorization roles (source of truth for staff).
 * Never trust user-editable JWT metadata for privileged roles.
 */
export interface RolesPort {
  listActiveRoles(userId: string): Promise<AppRole[]>;
}

export const ROLES_PORT = Symbol('ROLES_PORT');
