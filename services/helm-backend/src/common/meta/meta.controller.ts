import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../infrastructure/config/env';
import { Public } from '../auth/public.decorator';
import { AppException } from '../errors/app.exception';
import { ReadinessService } from './readiness.service';

@Public()
@Controller()
export class MetaController {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
  ) {}

  /** Liveness — process is running. */
  @Get('health')
  getHealth() {
    return {
      status: 'ok' as const,
      service: 'helm-backend',
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — safe for load balancers; 503 when DB configured but unreachable. */
  @Get('ready')
  async getReady() {
    const result = await this.readiness.check();
    const body = {
      status: result.status,
      service: 'helm-backend',
      checks: result.checks,
      detail: result.detail,
      timestamp: new Date().toISOString(),
    };
    if (result.status === 'unavailable') {
      throw new AppException({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'NOT_READY',
        title: 'Service unavailable',
        detail: result.detail ?? 'Readiness checks failed',
      });
    }
    return body;
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
