import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from 'jose';
import { APP_ENV, resolveJwtIssuer, type AppEnv } from '../../config/env';
import { type AuthPort, type AuthPrincipal } from '../../ports/auth.port';

const encoder = new TextEncoder();

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

      // Identity only — staff authorization comes from identity.user_roles via PrincipalResolver.
      return {
        userId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        roles: ['customer'],
        rolesSource: 'fallback',
        tokenUse: typeof payload.role === 'string' ? payload.role : undefined,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
