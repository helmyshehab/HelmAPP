import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import {
  TripDraftsRepository,
  type TripDraftRow,
} from '../infrastructure/trip-drafts.repository';

export type CreateTripDraftBody = {
  destinationId?: string | null;
  title?: string | null;
  constraints?: Record<string, unknown>;
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
