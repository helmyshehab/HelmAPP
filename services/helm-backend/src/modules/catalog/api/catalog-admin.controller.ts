import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { LIFECYCLE_STATUSES } from '../domain/lifecycle';
import { CatalogAdminService } from '../application/catalog-admin.service';
import { CatalogCoverUploadInterceptor } from './catalog-cover-upload.interceptor';

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

const importRunListQuery = z.object({
  status: z.enum(['completed', 'partial', 'failed']).optional(),
  dryRun: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sourceLabel: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const staffListQuery = z.object({
  category: z.string().max(40).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const staffDestinationListQuery = z.object({
  q: z.string().max(120).optional(),
  country: z.string().length(2).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  lifecycleStatus: z.enum(LIFECYCLE_STATUSES).optional(),
  parentId: z.string().uuid().optional(),
  topLevelOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createDestinationBody = z
  .object({
    slug: z.string().min(1).max(120),
    nameEn: z.string().min(1).max(200),
    nameAr: z.string().min(1).max(200),
    shortDescriptionEn: z.string().max(500).optional(),
    shortDescriptionAr: z.string().max(500).optional(),
    summaryEn: z.string().optional(),
    summaryAr: z.string().optional(),
    descriptionEn: z.string().max(10000).optional(),
    descriptionAr: z.string().max(10000).optional(),
    countryCode: z.string().length(2),
    cityId: z.string().uuid().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    timezone: z.string().max(80).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    addressText: z.string().optional(),
    websiteUrl: z.string().url().optional(),
    isFeatured: z.boolean().optional(),
    externalKey: z.string().max(200).optional(),
    tagSlugs: z.array(z.string().min(1).max(120)).optional(),
  })
  .strict();

const updateDestinationBody = z
  .object({
    slug: z.string().min(1).max(120).optional(),
    nameEn: z.string().min(1).max(200).optional(),
    nameAr: z.string().min(1).max(200).optional(),
    shortDescriptionEn: z.string().max(500).nullable().optional(),
    shortDescriptionAr: z.string().max(500).nullable().optional(),
    summaryEn: z.string().nullable().optional(),
    summaryAr: z.string().nullable().optional(),
    descriptionEn: z.string().max(10000).nullable().optional(),
    descriptionAr: z.string().max(10000).nullable().optional(),
    countryCode: z.string().length(2).optional(),
    cityId: z.string().uuid().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    timezone: z.string().max(80).nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    addressText: z.string().nullable().optional(),
    websiteUrl: z.string().url().nullable().optional(),
    isFeatured: z.boolean().optional(),
    externalKey: z.string().max(200).nullable().optional(),
  })
  .strict();

const replaceTagsBody = z
  .object({
    tagSlugs: z.array(z.string().min(1).max(120)),
  })
  .strict();

const updateCoverAltBody = z
  .object({
    altTextEn: z.string().min(1).max(500),
    altTextAr: z.string().max(500).nullable().optional(),
  })
  .strict();

type UploadedCoverFile = {
  buffer?: Buffer;
  mimetype?: string;
  size?: number;
};

@Controller('admin/catalog')
export class CatalogAdminController {
  constructor(@Inject(CatalogAdminService) private readonly admin: CatalogAdminService) {}

  @Get('destinations')
  @Roles('operator', 'administrator', 'super-administrator')
  listDestinations(
    @Query(new ZodValidationPipe(staffDestinationListQuery))
    query: z.infer<typeof staffDestinationListQuery>,
  ) {
    return this.admin.listStaffDestinations(query);
  }

  @Post('destinations')
  @Roles('operator', 'administrator', 'super-administrator')
  createDestination(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(createDestinationBody))
    body: z.infer<typeof createDestinationBody>,
  ) {
    return this.admin.createDestination(user, body);
  }

  @Get('destinations/:id')
  @Roles('operator', 'administrator', 'super-administrator')
  getDestination(@Param('id') id: string) {
    return this.admin.getStaffDestination(id);
  }

  @Patch('destinations/:id')
  @Roles('operator', 'administrator', 'super-administrator')
  updateDestination(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDestinationBody))
    body: z.infer<typeof updateDestinationBody>,
  ) {
    return this.admin.updateDestination(user, id, body);
  }

  @Post('destinations/:id/transition')
  @Roles('operator', 'administrator', 'super-administrator')
  transitionDestination(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionBody)) body: z.infer<typeof transitionBody>,
  ) {
    return this.admin.transitionDestination(user, id, body.to, body.rejectionReason);
  }

  @Put('destinations/:id/tags')
  @Roles('operator', 'administrator', 'super-administrator')
  replaceDestinationTags(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replaceTagsBody)) body: z.infer<typeof replaceTagsBody>,
  ) {
    return this.admin.replaceDestinationTags(user, id, body.tagSlugs);
  }

  @Post('destinations/:id/cover')
  @Roles('administrator', 'super-administrator')
  @UseInterceptors(CatalogCoverUploadInterceptor('file'))
  uploadDestinationCover(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @UploadedFile() file: UploadedCoverFile | undefined,
    @Body() body: { altTextEn?: string; altTextAr?: string },
  ) {
    return this.admin.uploadDestinationCover(
      user,
      id,
      file?.buffer
        ? { buffer: file.buffer, mimetype: file.mimetype, size: file.size }
        : undefined,
      body?.altTextEn,
      body?.altTextAr,
    );
  }

  @Patch('destinations/:id/cover')
  @Roles('administrator', 'super-administrator')
  updateDestinationCoverAlt(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCoverAltBody))
    body: z.infer<typeof updateCoverAltBody>,
  ) {
    return this.admin.updateDestinationCoverAlt(user, id, body);
  }

  @Delete('destinations/:id/cover')
  @Roles('administrator', 'super-administrator')
  deleteDestinationCover(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
  ) {
    return this.admin.deleteDestinationCover(user, id);
  }

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

  @Get('places/:id')
  @Roles('operator', 'administrator', 'super-administrator')
  getPlace(@Param('id') id: string) {
    return this.admin.getStaffPlace(id);
  }

  @Post('places/:id/cover')
  @Roles('administrator', 'super-administrator')
  @UseInterceptors(CatalogCoverUploadInterceptor('file'))
  uploadPlaceCover(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @UploadedFile() file: UploadedCoverFile | undefined,
    @Body() body: { altTextEn?: string; altTextAr?: string },
  ) {
    return this.admin.uploadPlaceCover(
      user,
      id,
      file?.buffer
        ? { buffer: file.buffer, mimetype: file.mimetype, size: file.size }
        : undefined,
      body?.altTextEn,
      body?.altTextAr,
    );
  }

  @Patch('places/:id/cover')
  @Roles('administrator', 'super-administrator')
  updatePlaceCoverAlt(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCoverAltBody))
    body: z.infer<typeof updateCoverAltBody>,
  ) {
    return this.admin.updatePlaceCoverAlt(user, id, body);
  }

  @Delete('places/:id/cover')
  @Roles('administrator', 'super-administrator')
  deletePlaceCover(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
  ) {
    return this.admin.deletePlaceCover(user, id);
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

  @Get('import-runs')
  @Roles('operator', 'administrator', 'super-administrator')
  listImportRuns(
    @CurrentUser() user: AuthPrincipal,
    @Query(new ZodValidationPipe(importRunListQuery))
    query: z.infer<typeof importRunListQuery>,
  ) {
    return this.admin.listImportRuns(user, query);
  }

  @Get('import-runs/:id')
  @Roles('operator', 'administrator', 'super-administrator')
  getImportRun(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.admin.getImportRun(user, id);
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
