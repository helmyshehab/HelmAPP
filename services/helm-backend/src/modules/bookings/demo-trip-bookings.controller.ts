import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AppException } from '../../common/errors/app.exception';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../infrastructure/ports/auth.port';
import { DemoTripBookingsService } from './demo-trip-bookings.service';

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
