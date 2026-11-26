import { Module } from '@nestjs/common';
import { PackagesAdminController, PackagesPublicController } from './api/packages.controller';
import { PackagesService } from './application/packages.service';
import { PackagesRepository } from './infrastructure/packages.repository';

@Module({
  controllers: [PackagesPublicController, PackagesAdminController],
  providers: [PackagesRepository, PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
