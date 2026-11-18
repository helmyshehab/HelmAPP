import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from 'jose';
import { APP_ENV, resolveJwtIssuer, type AppEnv } from '../../config/env';
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
 * Supabase JWT AuthPort — verifies access tokens via JWKS (hosted/local Supabase)
 * or HS256 JWT secret for local Supabase CLI. Domain modules never import Supabase SDK.
 *
 * Authorization roles are read ONLY from app_metadata.roles (server-controlled).
 * user_metadata is intentionally ignored — clients can write it and must not escalate.
 */
@Injectable()
export class SupabaseJwtAuthAdapter implements AuthPort {
  private readonly env: AppEnv;
  private readonly issuer?: string;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.env = env;
    this.issuer = resolveJwtIssuer(env);
    if (env.SUPABASE_URL) {
      const url = new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL);
      this.jwks = createRemoteJWKSet(url);
    }
  }

  async verifyAccessToken(accessToken: string): Promise<AuthPrincipal> {
    try {
      const options: JWTVerifyOptions = {
        audience: this.env.SUPABASE_JWT_AUDIENCE,
      };
      if (this.issuer) {
        options.issuer = this.issuer;
      }

      let payload;
      if (this.jwks) {
        ({ payload } = await jwtVerify(accessToken, this.jwks, options));
      } else if (this.env.SUPABASE_JWT_SECRET) {
        ({ payload } = await jwtVerify(
          accessToken,
          encoder.encode(this.env.SUPABASE_JWT_SECRET),
          options,
        ));
      } else {
        throw new UnauthorizedException('Auth verifier is not configured');
      }

      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Token missing subject');
      }

      const appMeta = (payload.app_metadata ?? {}) as { roles?: unknown };
      const rolesRaw = Array.isArray(appMeta.roles) ? appMeta.roles : ['customer'];
      const roles = rolesRaw.filter(isAppRole);
      if (!roles.includes('customer')) roles.push('customer');

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
