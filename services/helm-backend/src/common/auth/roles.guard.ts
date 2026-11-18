import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole } from '../../infrastructure/ports/auth.port';
import { AppException } from '../errors/app.exception';
import type { AuthedRequest } from './current-user.decorator';
import { ROLES_KEY } from './roles.decorator';

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
    const roles = req.user?.roles ?? [];
    const allowed = required.some((role) => roles.includes(role));
    if (!allowed) {
      throw AppException.forbidden(`Requires one of roles: ${required.join(', ')}`);
    }
    return true;
  }
}
