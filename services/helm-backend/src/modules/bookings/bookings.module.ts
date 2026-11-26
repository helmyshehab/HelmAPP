import { Module } from '@nestjs/common';
import { DemoTripBookingsController, DemoTripBookingStaffController } from './demo-trip-bookings.controller';
import { DemoTripBookingsService } from './demo-trip-bookings.service';

@Module({
  controllers: [DemoTripBookingsController, DemoTripBookingStaffController],
  providers: [DemoTripBookingsService],
})
export class BookingsModule {}
