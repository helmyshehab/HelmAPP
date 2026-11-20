import { Inject, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import {
  IdentityRepository,
  type BootstrapResult,
} from '../infrastructure/identity.repository';

export type BootstrapCustomerProfileResponse = BootstrapResult;

/**
 * Ensure the verified JWT subject has a Helm account + customer profile.
 * Account id is derived only from principal.userId (JWT sub).
 */
@Injectable()
export class BootstrapCustomerProfileUseCase {
  constructor(
    @Inject(IdentityRepository) private readonly identity: IdentityRepository,
  ) {}

  execute(principal: AuthPrincipal): Promise<BootstrapCustomerProfileResponse> {
    return this.identity.bootstrapCustomerProfile({
      userId: principal.userId,
      email: principal.email,
    });
  }
}
