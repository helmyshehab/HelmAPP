import { Module } from '@nestjs/common';
import { CatalogAdminController } from './api/catalog-admin.controller';
import { CatalogPublicController } from './api/catalog-public.controller';
import { CatalogAdminService } from './application/catalog-admin.service';
import { CatalogQueryService } from './application/catalog-query.service';
import { CatalogRepository } from './infrastructure/catalog.repository';

@Module({
  controllers: [CatalogPublicController, CatalogAdminController],
  providers: [CatalogRepository, CatalogQueryService, CatalogAdminService],
  exports: [CatalogQueryService, CatalogAdminService],
})
export class CatalogModule {}
