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
export const MOCK_JWT_ISSUER = 'helm://mock-auth';

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * MOCK AuthPort for local/CI — issues and verifies HS256 JWTs with SUPABASE_JWT_SECRET.
 * No network calls. Must never be selected when NODE_ENV=production (enforced in loadEnv).
 *
 * Roles are taken only from app_metadata.roles (server-controlled claims), never user_metadata.
 */
@Injectable()
export class MockAuthAdapter implements AuthPort {
  private readonly secret: Uint8Array;
  private readonly audience: string;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    // Production selection is blocked in loadEnv + InfrastructureModule.forRoot.
    if (!env.SUPABASE_JWT_SECRET) {
      throw new Error('MockAuthAdapter requires SUPABASE_JWT_SECRET');
    }
    this.secret = encoder.encode(env.SUPABASE_JWT_SECRET);
    this.audience = env.SUPABASE_JWT_AUDIENCE;
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
      .setIssuer(MOCK_JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('2h')
      .setAudience(this.audience)
      .sign(this.secret);
  }

  async verifyAccessToken(accessToken: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(accessToken, this.secret, {
        audience: this.audience,
        issuer: MOCK_JWT_ISSUER,
      });
      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Token missing subject');
      }
      // Trust only app_metadata (not user_metadata — client-writable in Supabase).
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
