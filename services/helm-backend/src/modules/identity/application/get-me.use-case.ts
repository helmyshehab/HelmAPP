import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';

export type MeResponse = {
  userId: string;
  email?: string;
  roles: AuthPrincipal['roles'];
  rolesSource: AuthPrincipal['rolesSource'];
};

/**
 * Application use case — map authenticated principal to /v1/me DTO.
 * Roles are database-backed when rolesSource=database.
 */
@Injectable()
export class GetMeUseCase {
  execute(principal: AuthPrincipal): MeResponse {
    return {
      userId: principal.userId,
      email: principal.email,
      roles: principal.roles,
      rolesSource: principal.rolesSource,
    };
  }
}
