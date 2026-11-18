import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';

export type MeResponse = {
  userId: string;
  email?: string;
  roles: AuthPrincipal['roles'];
};

/**
 * Application use case — map authenticated principal to /v1/me DTO.
 * No catalog/booking/payment logic.
 */
@Injectable()
export class GetMeUseCase {
  execute(principal: AuthPrincipal): MeResponse {
    return {
      userId: principal.userId,
      email: principal.email,
      roles: principal.roles,
    };
  }
}
