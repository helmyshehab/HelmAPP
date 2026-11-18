import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole } from '../../infrastructure/ports/auth.port';
import { AppException } from '../errors/app.exception';
import type { AuthedRequest } from './current-user.decorator';
import { ROLES_KEY } from './roles.decorator';

const STAFF_ROLES: readonly AppRole[] = [
  'operator',
  'administrator',
  'super-administrator',
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user) {
      throw AppException.unauthorized('Authentication required');
    }

    const needsStaff = required.some((role) => STAFF_ROLES.includes(role));
    if (needsStaff && user.rolesSource !== 'database') {
      // Fail closed: cannot privilege-check without DB-backed roles.
      throw AppException.forbidden('Authorization roles unavailable');
    }

    const roles = user.roles ?? [];
    const allowed = required.some((role) => roles.includes(role));
    if (!allowed) {
      throw AppException.forbidden(`Requires one of roles: ${required.join(', ')}`);
    }
    return true;
  }
}
