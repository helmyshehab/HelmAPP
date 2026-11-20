import { Module } from '@nestjs/common';
import { TripDraftsController } from './api/trip-drafts.controller';
import { TripDraftsService } from './application/trip-drafts.service';
import { TripDraftsRepository } from './infrastructure/trip-drafts.repository';

/**
 * TripBuilderModule — private trip drafts (owner-scoped API).
 */
@Module({
  controllers: [TripDraftsController],
  providers: [TripDraftsRepository, TripDraftsService],
  exports: [TripDraftsService],
})
export class TripBuilderModule {}
