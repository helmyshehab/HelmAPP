import { Inject, Injectable } from '@nestjs/common';
import postgres from 'postgres';
import { APP_ENV, type AppEnv } from '../../infrastructure/config/env';

export type ReadinessResult = {
  status: 'ok' | 'degraded' | 'unavailable';
  checks: {
    database: 'ok' | 'skipped' | 'failed';
  };
  detail?: string;
};

/**
 * Readiness checks — distinct from liveness.
 * - Liveness (/health): process is up.
 * - Readiness (/ready): required dependencies for traffic.
 *
 * In production, DATABASE_URL is required at boot; a failed DB ping → unavailable.
 * Outside production, missing DATABASE_URL is reported as skipped/degraded (not "ok").
 */
@Injectable()
export class ReadinessService {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  async check(): Promise<ReadinessResult> {
    if (!this.env.DATABASE_URL) {
      return {
        status: 'degraded',
        checks: { database: 'skipped' },
        detail: 'DATABASE_URL not set; readiness cannot confirm database',
      };
    }

    let sql: ReturnType<typeof postgres> | undefined;
    try {
      sql = postgres(this.env.DATABASE_URL, {
        max: 1,
        connect_timeout: 3,
        idle_timeout: 1,
      });
      await sql`select 1`;
      return { status: 'ok', checks: { database: 'ok' } };
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'database check failed';
      // Never echo connection strings / host details to API clients in production.
      const detail =
        this.env.NODE_ENV === 'production'
          ? 'database check failed'
          : sanitizeDbError(raw);
      return {
        status: 'unavailable',
        checks: { database: 'failed' },
        detail,
      };
    } finally {
      if (sql) {
        await sql.end({ timeout: 1 }).catch(() => undefined);
      }
    }
  }
}

function sanitizeDbError(message: string): string {
  return message
    .replace(/postgresql:\/\/[^\s]+/gi, 'postgresql://***')
    .replace(/password=[^\s&]+/gi, 'password=***')
    .slice(0, 200);
}
