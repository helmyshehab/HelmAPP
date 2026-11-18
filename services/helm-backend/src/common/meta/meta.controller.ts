import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_ENV, type AppEnv } from '../../infrastructure/config/env';
import { Public } from '../auth/public.decorator';
import { ReadinessService } from './readiness.service';

@Public()
@Controller()
export class MetaController {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
  ) {}

  /** Liveness — process is running (no dependency checks). */
  @Get('health')
  getHealth() {
    return {
      status: 'ok' as const,
      service: 'helm-backend',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness — load balancers should use this, not /health.
   * Returns ReadyResponse body on both 200 and 503 (OpenAPI contract).
   */
  @Get('ready')
  async getReady(@Res({ passthrough: true }) res: Response) {
    const result = await this.readiness.check();
    if (result.status === 'unavailable') {
      res.status(503);
    }
    return {
      status: result.status,
      service: 'helm-backend',
      checks: result.checks,
      detail: result.detail,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('meta')
  getMeta() {
    return {
      name: this.env.APP_NAME,
      version: this.env.APP_VERSION,
      apiVersion: this.env.API_VERSION,
    };
  }
}
