import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../errors/app.exception';
import type { AuthedRequest } from './current-user.decorator';
import { PrincipalResolver } from './principal-resolver.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrincipalResolver) private readonly principals: PrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppException.unauthorized('Missing Bearer access token');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw AppException.unauthorized('Missing Bearer access token');
    }
    req.user = await this.principals.resolveFromAccessToken(token);
    return true;
  }
}
