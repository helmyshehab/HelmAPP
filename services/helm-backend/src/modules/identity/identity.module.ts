import { Module } from '@nestjs/common';
import { GetMeUseCase } from './application/get-me.use-case';
import { BootstrapCustomerProfileUseCase } from './application/bootstrap-customer-profile.use-case';
import { MeController } from './api/me.controller';
import { CustomerProfileController } from './api/customer-profile.controller';
import { IdentityRepository } from './infrastructure/identity.repository';

/**
 * IdentityModule — authz integration, /v1/me, and customer profile bootstrap.
 */
@Module({
  controllers: [MeController, CustomerProfileController],
  providers: [GetMeUseCase, BootstrapCustomerProfileUseCase, IdentityRepository],
  exports: [GetMeUseCase, BootstrapCustomerProfileUseCase],
})
export class IdentityModule {}
