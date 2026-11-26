import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { APP_ENV, loadEnv, type AppEnv } from './config/env';
import { createDrizzleClient, DRIZZLE } from './adapters/drizzle/drizzle.client';
import { DrizzleRolesAdapter } from './adapters/drizzle/drizzle-roles.adapter';
import { MemoryRolesAdapter } from './adapters/memory/memory-roles.adapter';
import { MockAiAdapter } from './adapters/mock/mock-ai.adapter';
import { MockAuthAdapter } from './adapters/mock/mock-auth.adapter';
import { MockFlightAdapter } from './adapters/mock/mock-flight.adapter';
import { MockNotifyAdapter } from './adapters/mock/mock-notify.adapter';
import { MockPaymentAdapter } from './adapters/mock/mock-payment.adapter';
import { MockStorageAdapter } from './adapters/mock/mock-storage.adapter';
import { SupabaseJwtAuthAdapter } from './adapters/supabase/supabase-jwt-auth.adapter';
import { SupabaseStorageAdapter } from './adapters/supabase/supabase-storage.adapter';
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
import { ROLES_PORT } from './ports/roles.port';

/**
 * Wires infrastructure adapters. Domain modules depend on ports only.
 * Mock auth is registered only when AUTH_PROVIDER=mock (never in production — loadEnv forbids it).
 * RolesPort prefers Drizzle/Postgres when DATABASE_URL is set.
 * StoragePort uses mock by default; STORAGE_PROVIDER=supabase selects the REST adapter.
 */
@Global()
@Module({})
export class InfrastructureModule {
  static forRoot(source: NodeJS.ProcessEnv = process.env): DynamicModule {
    const env = loadEnv(source);
    const useMockAuth = env.AUTH_PROVIDER === 'mock';
    const useDbRoles = Boolean(env.DATABASE_URL);
    const useSupabaseStorage = env.STORAGE_PROVIDER === 'supabase';

    const authProviders = useMockAuth
      ? [
          MockAuthAdapter,
          { provide: AUTH_PORT, useExisting: MockAuthAdapter },
        ]
      : [
          SupabaseJwtAuthAdapter,
          { provide: AUTH_PORT, useExisting: SupabaseJwtAuthAdapter },
        ];

    const rolesProviders = useDbRoles
      ? [
          {
            provide: DRIZZLE,
            useFactory: (appEnv: AppEnv) => createDrizzleClient(appEnv.DATABASE_URL!),
            inject: [APP_ENV],
          },
          DrizzleRolesAdapter,
          { provide: ROLES_PORT, useExisting: DrizzleRolesAdapter },
        ]
      : [
          MemoryRolesAdapter,
          { provide: ROLES_PORT, useExisting: MemoryRolesAdapter },
        ];

    const storageProviders = useSupabaseStorage
      ? [
          SupabaseStorageAdapter,
          { provide: STORAGE_PORT, useExisting: SupabaseStorageAdapter },
        ]
      : [
          MockStorageAdapter,
          { provide: STORAGE_PORT, useExisting: MockStorageAdapter },
        ];

    return {
      module: InfrastructureModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: APP_ENV,
          useValue: env,
        },
        ...authProviders,
        ...rolesProviders,
        ...storageProviders,
        SystemClockAdapter,
        MockPaymentAdapter,
        MockAiAdapter,
        MockFlightAdapter,
        MockNotifyAdapter,
        { provide: CLOCK_PORT, useExisting: SystemClockAdapter },
        { provide: PAYMENT_PORT, useExisting: MockPaymentAdapter },
        { provide: AI_PORT, useExisting: MockAiAdapter },
        { provide: FLIGHT_PORT, useExisting: MockFlightAdapter },
        { provide: NOTIFY_PORT, useExisting: MockNotifyAdapter },
      ],
      exports: [
        ConfigModule,
        APP_ENV,
        AUTH_PORT,
        ROLES_PORT,
        CLOCK_PORT,
        STORAGE_PORT,
        PAYMENT_PORT,
        AI_PORT,
        FLIGHT_PORT,
        NOTIFY_PORT,
        ...(useMockAuth ? [MockAuthAdapter] : []),
        ...(useDbRoles ? [DRIZZLE] : [MemoryRolesAdapter]),
      ],
    };
  }
}

/** @deprecated type helper for tests */
export type { AppEnv };
