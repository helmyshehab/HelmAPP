import { Module } from '@nestjs/common';
import { GetMeUseCase } from './application/get-me.use-case';
import { MeController } from './api/me.controller';

/**
 * IdentityModule — authz integration + /v1/me foundation.
 * Profile CMS and BD-12 auth method flows land in later phases.
 */
@Module({
  controllers: [MeController],
  providers: [GetMeUseCase],
  exports: [GetMeUseCase],
})
export class IdentityModule {}
