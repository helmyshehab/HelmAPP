import { Controller, Get } from '@nestjs/common';

@Controller('v1')
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok' as const,
      service: 'helm-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('meta')
  getMeta() {
    return {
      name: 'Helm حلم',
      version: '0.0.1',
      apiVersion: 'v1',
    };
  }
}
