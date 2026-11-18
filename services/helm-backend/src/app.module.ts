import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { ProblemDetailsFilter } from './common/errors/problem.filter';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { StructuredLogger } from './common/logging/structured-logger';
import { MetaModule } from './common/meta/meta.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PackagesModule } from './modules/packages/packages.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { TripBuilderModule } from './modules/trip_builder/trip_builder.module';

@Module({
  imports: [
    InfrastructureModule,
    MetaModule,
    IdentityModule,
    CatalogModule,
    PricingModule,
    PackagesModule,
    QuotationsModule,
    BookingsModule,
    PaymentsModule,
    FulfillmentModule,
    TripBuilderModule,
    AiModule,
    AuditModule,
  ],
  providers: [
    StructuredLogger,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
