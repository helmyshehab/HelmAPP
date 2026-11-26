import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AppException } from '../../../common/errors/app.exception';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { TripDraftsService } from '../application/trip-drafts.service';

const jsonObject = z.record(z.unknown());

const createTripDraftBody = z
  .object({
    destinationId: z.string().uuid().nullable().optional(),
    title: z.string().max(200).nullable().optional(),
    constraints: jsonObject.optional(),
    clientRequestKey: z.string().min(1).max(128).optional(),
  })
  .strict();

const updateTripDraftBody = z
  .object({
    destinationId: z.string().uuid().nullable().optional(),
    title: z.string().max(200).nullable().optional(),
    constraints: jsonObject.optional(),
  })
  .strict();

const createTripDraftQuoteBody = z.object({
  expectedConstraints: jsonObject.optional(),
}).strict().default({});

@Controller('trips/drafts')
export class TripDraftsController {
  constructor(
    @Inject(TripDraftsService) private readonly tripDrafts: TripDraftsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthPrincipal | undefined) {
    return this.tripDrafts.list(requireUser(user));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Body(new ZodValidationPipe(createTripDraftBody))
    body: z.infer<typeof createTripDraftBody>,
  ) {
    return this.tripDrafts.create(requireUser(user), body);
  }

  @Get(':id/itinerary')
  getItinerary(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Param('id') id: string,
  ) {
    assertUuid(id);
    return this.tripDrafts.getItinerary(requireUser(user), id);
  }

  @Post(':id/quote')
  @HttpCode(HttpStatus.CREATED)
  createQuote(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createTripDraftQuoteBody))
    body: z.infer<typeof createTripDraftQuoteBody>,
  ) {
    assertUuid(id);
    return this.tripDrafts.createQuote(requireUser(user), id, body.expectedConstraints);
  }

  @Get(':id/quote')
  getQuote(@CurrentUser() user: AuthPrincipal | undefined, @Param('id') id: string) {
    assertUuid(id);
    return this.tripDrafts.getQuote(requireUser(user), id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Param('id') id: string,
  ) {
    assertUuid(id);
    return this.tripDrafts.get(requireUser(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthPrincipal | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTripDraftBody))
    body: z.infer<typeof updateTripDraftBody>,
  ) {
    assertUuid(id);
    return this.tripDrafts.update(requireUser(user), id, body);
  }
}

function requireUser(user: AuthPrincipal | undefined): AuthPrincipal {
  if (!user) {
    throw AppException.unauthorized('Authentication required');
  }
  return user;
}

function assertUuid(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    throw AppException.validation('Trip draft id must be a UUID');
  }
}
