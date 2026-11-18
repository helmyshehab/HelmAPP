import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { APP_ENV, type AppEnv } from './config/env';
import { MockAiAdapter } from './adapters/mock/mock-ai.adapter';
import { MockAuthAdapter } from './adapters/mock/mock-auth.adapter';
import { MockFlightAdapter } from './adapters/mock/mock-flight.adapter';
import { MockNotifyAdapter } from './adapters/mock/mock-notify.adapter';
import { MockPaymentAdapter } from './adapters/mock/mock-payment.adapter';
import { MockStorageAdapter } from './adapters/mock/mock-storage.adapter';
import { SupabaseJwtAuthAdapter } from './adapters/supabase/supabase-jwt-auth.adapter';
import { SystemClockAdapter } from './adapters/system/system-clock.adapter';
import {
  AI_PORT,
  AUTH_PORT,
  CLOCK_PORT,
  FLIGHT_PORT,
  NOTIFY_PORT,
  PAYMENT_PORT,
  STORAGE_PORT,
} from './ports';

/**
 * Wires infrastructure adapters. Domain modules depend on ports only.
 * Default local path uses MOCK auth + provider adapters (no paid APIs).
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MockAuthAdapter,
    SupabaseJwtAuthAdapter,
    SystemClockAdapter,
    MockStorageAdapter,
    MockPaymentAdapter,
    MockAiAdapter,
    MockFlightAdapter,
    MockNotifyAdapter,
    {
      provide: AUTH_PORT,
      inject: [APP_ENV, MockAuthAdapter, SupabaseJwtAuthAdapter],
      useFactory: (
        env: AppEnv,
        mockAuth: MockAuthAdapter,
        supabaseAuth: SupabaseJwtAuthAdapter,
      ) => (env.AUTH_PROVIDER === 'supabase_jwt' ? supabaseAuth : mockAuth),
    },
    { provide: CLOCK_PORT, useExisting: SystemClockAdapter },
    { provide: STORAGE_PORT, useExisting: MockStorageAdapter },
    { provide: PAYMENT_PORT, useExisting: MockPaymentAdapter },
    { provide: AI_PORT, useExisting: MockAiAdapter },
    { provide: FLIGHT_PORT, useExisting: MockFlightAdapter },
    { provide: NOTIFY_PORT, useExisting: MockNotifyAdapter },
  ],
  exports: [
    ConfigModule,
    AUTH_PORT,
    CLOCK_PORT,
    STORAGE_PORT,
    PAYMENT_PORT,
    AI_PORT,
    FLIGHT_PORT,
    NOTIFY_PORT,
    MockAuthAdapter,
  ],
})
export class InfrastructureModule {}
