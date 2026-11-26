import { Module } from '@nestjs/common';
import { DemoTripBookingsController } from './demo-trip-bookings.controller';
import { DemoTripBookingsService } from './demo-trip-bookings.service';

@Module({
  controllers: [DemoTripBookingsController],
  providers: [DemoTripBookingsService],
})
export class BookingsModule {}
