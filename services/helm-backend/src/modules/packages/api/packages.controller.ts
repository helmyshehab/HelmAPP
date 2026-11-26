import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../../common/auth/public.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import { PackagesService } from '../application/packages.service';

const contentSchema = z.record(z.unknown()).nullable().optional();

const createBody = z
  .object({
    destinationId: z.string().uuid(),
    slug: z.string().min(1).max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    titleEn: z.string().min(1).max(200),
    titleAr: z.string().min(1).max(200),
    summaryEn: z.string().max(2000).nullable().optional(),
    summaryAr: z.string().max(2000).nullable().optional(),
    marketCode: z.string().min(1).max(64).optional(),
    content: contentSchema,
  })
  .strict();

const updateBody = z
  .object({
    titleEn: z.string().min(1).max(200).optional(),
    titleAr: z.string().min(1).max(200).optional(),
    summaryEn: z.string().max(2000).nullable().optional(),
    summaryAr: z.string().max(2000).nullable().optional(),
    content: contentSchema,
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  });

@Controller()
export class PackagesPublicController {
  constructor(@Inject(PackagesService) private readonly packages: PackagesService) {}

  @Public()
  @Get('packages')
  list() {
    return this.packages.listPublic();
  }

  @Public()
  @Get('packages/:slug')
  get(@Param('slug') slug: string) {
    return this.packages.getPublicBySlug(slug);
  }
}

@Controller('admin/packages')
export class PackagesAdminController {
  constructor(@Inject(PackagesService) private readonly packages: PackagesService) {}

  @Get()
  @Roles('operator', 'administrator', 'super-administrator')
  list() {
    return this.packages.listAdmin();
  }

  @Post()
  @Roles('administrator', 'super-administrator')
  create(@Body(new ZodValidationPipe(createBody)) body: z.infer<typeof createBody>) {
    return this.packages.create(body);
  }

  @Get(':id')
  @Roles('operator', 'administrator', 'super-administrator')
  get(@Param('id') id: string) {
    return this.packages.getAdmin(id);
  }

  @Patch(':id')
  @Roles('administrator', 'super-administrator')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBody)) body: z.infer<typeof updateBody>,
  ) {
    return this.packages.update(id, body);
  }

  @Post(':id/unpublish')
  @Roles('administrator', 'super-administrator')
  unpublish(@Param('id') id: string) {
    return this.packages.unpublish(id);
  }

  @Post(':id/publish')
  @Roles('administrator', 'super-administrator')
  publish(@Param('id') id: string) {
    return this.packages.publish(id);
  }
}
