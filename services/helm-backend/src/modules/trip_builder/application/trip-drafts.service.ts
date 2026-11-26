import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import {
  TripDraftsRepository,
  type TripDraftItinerary,
  type TripDraftQuote,
  type TripDraftRow,
} from '../infrastructure/trip-drafts.repository';

export type CreateTripDraftBody = {
  destinationId?: string | null;
  title?: string | null;
  constraints?: Record<string, unknown>;
  clientRequestKey?: string;
};

export type UpdateTripDraftBody = {
  destinationId?: string | null;
  title?: string | null;
  constraints?: Record<string, unknown>;
};

@Injectable()
export class TripDraftsService {
  constructor(
    @Inject(TripDraftsRepository) private readonly drafts: TripDraftsRepository,
  ) {}

  create(principal: AuthPrincipal, body: CreateTripDraftBody): Promise<TripDraftRow> {
    return this.drafts.create({
      userId: principal.userId,
      destinationId: body.destinationId,
      title: body.title,
      constraints: body.constraints,
      clientRequestKey: body.clientRequestKey,
    });
  }

  async list(principal: AuthPrincipal): Promise<{ items: TripDraftRow[] }> {
    const items = await this.drafts.listForOwner(principal.userId);
    return { items };
  }

  async get(principal: AuthPrincipal, id: string): Promise<TripDraftRow> {
    const row = await this.drafts.getForOwner(principal.userId, id);
    if (!row) throw AppException.notFound('Trip draft not found');
    return row;
  }

  async getItinerary(
    principal: AuthPrincipal,
    id: string,
  ): Promise<TripDraftItinerary> {
    const itinerary = await this.drafts.getItineraryForOwner(
      principal.userId,
      id,
    );
    if (!itinerary) throw AppException.notFound('Trip draft not found');
    return itinerary;
  }

  async createQuote(
    principal: AuthPrincipal,
    id: string,
    expectedConstraints?: Record<string, unknown>,
  ): Promise<TripDraftQuote> {
    const quote = await this.drafts.createQuoteForOwner(principal.userId, id, expectedConstraints);
    if (!quote) throw AppException.notFound('Trip draft not found');
    return quote;
  }

  async getQuote(principal: AuthPrincipal, id: string): Promise<TripDraftQuote> {
    const quote = await this.drafts.getQuoteForOwner(principal.userId, id);
    if (!quote) throw AppException.notFound('Current trip draft quote not found');
    return quote;
  }

  async update(
    principal: AuthPrincipal,
    id: string,
    body: UpdateTripDraftBody,
  ): Promise<TripDraftRow> {
    const row = await this.drafts.updateForOwner({
      userId: principal.userId,
      id,
      destinationId: body.destinationId,
      title: body.title,
      constraints: body.constraints,
      patchDestinationId: Object.prototype.hasOwnProperty.call(body, 'destinationId'),
      patchTitle: Object.prototype.hasOwnProperty.call(body, 'title'),
      patchConstraints: Object.prototype.hasOwnProperty.call(body, 'constraints'),
    });
    if (!row) throw AppException.notFound('Trip draft not found');
    return row;
  }
}
