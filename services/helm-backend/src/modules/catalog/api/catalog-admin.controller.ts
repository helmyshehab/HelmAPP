import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { LIFECYCLE_STATUSES } from '../domain/lifecycle';
import { CatalogAdminService } from '../application/catalog-admin.service';

const createPlaceBody = z.object({
  destinationId: z.string().uuid(),
  category: z.string().min(1).max(40),
  subcategory: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(120),
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  shortDescriptionEn: z.string().max(500).optional(),
  descriptionEn: z.string().max(10000).optional(),
  externalKey: z.string().min(1).max(200).optional(),
});

const transitionBody = z.object({
  to: z.enum(LIFECYCLE_STATUSES),
  rejectionReason: z.string().min(1).max(1000).optional(),
});

const importBody = z.object({
  dryRun: z.boolean().default(true),
  payload: z.unknown(),
});

const staffListQuery = z.object({
  category: z.string().max(40).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

@Controller('admin/catalog')
export class CatalogAdminController {
  constructor(@Inject(CatalogAdminService) private readonly admin: CatalogAdminService) {}

  @Get('places')
  @Roles('operator', 'administrator', 'super-administrator')
  listPlaces(
    @Query(new ZodValidationPipe(staffListQuery)) query: z.infer<typeof staffListQuery>,
  ) {
    return this.admin.listStaffPlaces(query);
  }

  @Post('places')
  @Roles('operator', 'administrator', 'super-administrator')
  createPlace(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(createPlaceBody)) body: z.infer<typeof createPlaceBody>,
  ) {
    return this.admin.createPlace(user, body);
  }

  @Post('places/:id/transition')
  @Roles('operator', 'administrator', 'super-administrator')
  transition(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionBody)) body: z.infer<typeof transitionBody>,
  ) {
    return this.admin.transitionPlace(user, id, body.to, body.rejectionReason);
  }

  @Post('import')
  @Roles('operator', 'administrator', 'super-administrator')
  importCatalog(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(importBody)) body: z.infer<typeof importBody>,
  ) {
    return this.admin.importCatalog(user, body.payload, { dryRun: body.dryRun });
  }
}
