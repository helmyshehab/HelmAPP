import { Module } from '@nestjs/common';
import { TripDraftsController } from './api/trip-drafts.controller';
import {
  TripRequestsController,
  TripRequestsStaffController,
} from './api/trip-requests.controller';
import { TripDraftsService } from './application/trip-drafts.service';
import { TripRequestsService } from './application/trip-requests.service';
import { TripDraftsRepository } from './infrastructure/trip-drafts.repository';

/**
 * TripBuilderModule — private trip drafts + trip requests (owner-scoped API).
 */
@Module({
  controllers: [TripDraftsController, TripRequestsController, TripRequestsStaffController],
  providers: [TripDraftsRepository, TripDraftsService, TripRequestsService],
  exports: [TripDraftsService, TripRequestsService],
})
export class TripBuilderModule {}
