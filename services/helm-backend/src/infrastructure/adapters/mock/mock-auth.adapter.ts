import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { APP_ENV, type AppEnv } from '../../config/env';
import {
  APP_ROLES,
  type AppRole,
  type AuthPort,
  type AuthPrincipal,
} from '../../ports/auth.port';

const encoder = new TextEncoder();

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * MOCK AuthPort for local/CI — issues and verifies HS256 JWTs with SUPABASE_JWT_SECRET
 * or a deterministic local secret. No network calls. Not for production traffic.
 */
@Injectable()
export class MockAuthAdapter implements AuthPort {
  private readonly secret: Uint8Array;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    const raw =
      env.SUPABASE_JWT_SECRET ??
      'local-dev-only-helm-jwt-secret-min-32-chars';
    this.secret = encoder.encode(raw);
  }

  async issueAccessToken(input: {
    userId: string;
    email?: string;
    roles?: AppRole[];
  }): Promise<string> {
    const roles = input.roles?.length ? input.roles : (['customer'] as AppRole[]);
    return new SignJWT({
      sub: input.userId,
      email: input.email,
      role: 'authenticated',
      app_metadata: { roles },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .setAudience('authenticated')
      .sign(this.secret);
  }

  async verifyAccessToken(accessToken: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(accessToken, this.secret, {
        audience: 'authenticated',
      });
      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Token missing subject');
      }
      const meta = (payload.app_metadata ?? {}) as { roles?: unknown };
      const rolesRaw = Array.isArray(meta.roles) ? meta.roles : ['customer'];
      const roles = rolesRaw.filter(isAppRole);
      if (!roles.includes('customer')) {
        roles.push('customer');
      }
      return {
        userId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        roles,
        tokenUse: typeof payload.role === 'string' ? payload.role : undefined,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
