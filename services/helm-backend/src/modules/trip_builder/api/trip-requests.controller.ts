import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { AppException } from '../../../common/errors/app.exception';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { TripRequestsService } from '../application/trip-requests.service';

const submitBody = z
  .object({
    draftId: z.string().uuid(),
  })
  .strict();

const staffListQuery = z
  .object({
    id: z.string().uuid().optional(),
  })
  .strict();

const patchBody = z
  .object({
    status: z.enum(['under_review', 'declined']),
    staffNote: z.string().max(2000).nullable().optional(),
  })
  .strict();

@Controller('trips/requests')
export class TripRequestsController {
  constructor(@Inject(TripRequestsService) private readonly requests: TripRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthPrincipal | undefined) {
    if (!user) throw AppException.unauthorized();
    return this.requests.listForOwner(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthPrincipal | undefined, @Param('id') id: string) {
    if (!user) throw AppException.unauthorized();
    if (!z.string().uuid().safeParse(id).success) {
      throw AppException.validation('A trip request UUID is required');
    }
    return this.requests.getForOwner(user.userId, id);
  }

  @Post()
  submit(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Body(new ZodValidationPipe(submitBody)) body: z.infer<typeof submitBody>,
  ) {
    if (!user) throw AppException.unauthorized();
    return this.requests.submit(user.userId, body.draftId);
  }
}

@Controller('admin/trips/requests')
export class TripRequestsStaffController {
  constructor(@Inject(TripRequestsService) private readonly requests: TripRequestsService) {}

  @Get()
  @Roles('operator', 'administrator', 'super-administrator')
  list(
    @Query(new ZodValidationPipe(staffListQuery))
    query: z.infer<typeof staffListQuery>,
  ) {
    return this.requests.listForStaff(query.id);
  }

  @Get(':id')
  @Roles('operator', 'administrator', 'super-administrator')
  get(@Param('id') id: string) {
    if (!z.string().uuid().safeParse(id).success) {
      throw AppException.validation('A trip request UUID is required');
    }
    return this.requests.getForStaff(id);
  }

  @Patch(':id')
  @Roles('operator', 'administrator', 'super-administrator')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchBody)) body: z.infer<typeof patchBody>,
  ) {
    if (!z.string().uuid().safeParse(id).success) {
      throw AppException.validation('A trip request UUID is required');
    }
    return this.requests.updateStatus(id, body.status, body.staffNote);
  }
}
