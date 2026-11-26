import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AppException } from '../../common/errors/app.exception';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../infrastructure/ports/auth.port';
import { demoBookingServices, DemoTripBookingsService } from './demo-trip-bookings.service';

const checkoutBody = z.object({
  draftId: z.string().uuid(),
  quoteId: z.string().uuid(),
}).strict();

@Controller('trips/demo-bookings')
export class DemoTripBookingsController {
  constructor(@Inject(DemoTripBookingsService) private readonly bookings: DemoTripBookingsService) {}

  @Get()
  list(@CurrentUser() user: AuthPrincipal | undefined) {
    if (!user) throw AppException.unauthorized();
    return this.bookings.list(user.userId);
  }

  @Post()
  checkout(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Body(new ZodValidationPipe(checkoutBody)) body: z.infer<typeof checkoutBody>,
  ) {
    if (!user) throw AppException.unauthorized();
    return this.bookings.checkout(user.userId, body.draftId, body.quoteId);
  }
}

@Controller('admin/trips/demo-bookings')
export class DemoTripBookingStaffController {
  constructor(@Inject(DemoTripBookingsService) private readonly bookings: DemoTripBookingsService) {}

  @Get()
  @Roles('operator', 'administrator', 'super-administrator')
  list(
    @Query(new ZodValidationPipe(z.object({ id: z.string().uuid().optional() })))
    query: { id?: string },
  ) {
    return this.bookings.listForStaff(query.id);
  }

  @Patch(':id/services/:kind')
  @Roles('operator', 'administrator', 'super-administrator')
  confirmService(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Param('id') id: string,
    @Param('kind') kind: string,
  ) {
    if (!user) throw AppException.unauthorized();
    const service = z.enum(demoBookingServices).safeParse(kind);
    if (!z.string().uuid().safeParse(id).success || !service.success) {
      throw AppException.validation('A booking UUID and a supported service are required');
    }
    return this.bookings.confirmService(id, service.data, user.userId);
  }
}
