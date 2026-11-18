import { Module } from '@nestjs/common';
import { HealthController } from './common/health.controller';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PackagesModule } from './modules/packages/packages.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { TripBuilderModule } from './modules/trip_builder/trip_builder.module';
import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    InfrastructureModule,
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
  controllers: [HealthController],
})
export class AppModule {}
