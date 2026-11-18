import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_PORT, type AuthPort } from '../../infrastructure/ports/auth.port';
import { AppException } from '../errors/app.exception';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthedRequest } from './current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH_PORT) private readonly auth: AuthPort,
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
    req.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}
