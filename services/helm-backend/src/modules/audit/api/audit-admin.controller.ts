import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { AuditService } from '../audit.service';

const auditListQuery = z.object({
  entityType: z.enum([
    'destination',
    'place',
    'import_run',
    'poi',
    'media',
    'rating',
    'price',
  ]),
  entityId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

@Controller('admin/audit-events')
export class AuditAdminController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  @Roles('administrator', 'super-administrator')
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query(new ZodValidationPipe(auditListQuery)) query: z.infer<typeof auditListQuery>,
  ) {
    // Defense in depth: RolesGuard already requires admin+, fail closed on non-DB roles.
    if (
      user.rolesSource !== 'database' ||
      !(user.roles.includes('administrator') || user.roles.includes('super-administrator'))
    ) {
      throw AppException.forbidden('Administrator authorization required');
    }
    return this.audit.listByEntity({
      entityType: query.entityType,
      entityId: query.entityId,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }
}
