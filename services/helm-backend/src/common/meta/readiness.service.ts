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
 * Readiness checks — process is up; optionally verifies DATABASE_URL connectivity.
 * Does not implement product features.
 */
@Injectable()
export class ReadinessService {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  async check(): Promise<ReadinessResult> {
    if (!this.env.DATABASE_URL) {
      return {
        status: 'ok',
        checks: { database: 'skipped' },
        detail: 'DATABASE_URL not set; readiness skipped DB check',
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
      const detail = err instanceof Error ? err.message : 'database check failed';
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
