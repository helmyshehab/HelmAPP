import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AUTH_PORT,
  type AppRole,
  type AuthPort,
  type AuthPrincipal,
} from '../../infrastructure/ports/auth.port';
import { ROLES_PORT, type RolesPort } from '../../infrastructure/ports/roles.port';
import { StructuredLogger } from '../logging/structured-logger';

/**
 * JWT proves identity; database proves authorization roles.
 * Staff roles from JWT claims are ignored.
 */
@Injectable()
export class PrincipalResolver {
  constructor(
    @Inject(AUTH_PORT) private readonly auth: AuthPort,
    @Inject(ROLES_PORT) private readonly roles: RolesPort,
    @Optional() @Inject(StructuredLogger) private readonly logger?: StructuredLogger,
  ) {}

  async resolveFromAccessToken(accessToken: string): Promise<AuthPrincipal> {
    const verified = await this.auth.verifyAccessToken(accessToken);
    try {
      const dbRoles = await this.roles.listActiveRoles(verified.userId);
      const roles: AppRole[] = dbRoles.length > 0 ? [...dbRoles] : ['customer'];
      if (!roles.includes('customer')) {
        roles.push('customer');
      }
      return {
        userId: verified.userId,
        email: verified.email,
        roles,
        rolesSource: 'database',
        tokenUse: verified.tokenUse,
      };
    } catch (err) {
      this.logger?.warn(
        {
          msg: 'roles_resolve_failed',
          userId: verified.userId,
          detail: err instanceof Error ? err.message : 'unknown',
        },
        'PrincipalResolver',
      );
      // Fail closed for privileges: customer-only fallback; RolesGuard denies staff routes.
      return {
        userId: verified.userId,
        email: verified.email,
        roles: ['customer'],
        rolesSource: 'fallback',
        tokenUse: verified.tokenUse,
      };
    }
  }
}
