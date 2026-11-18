import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { ReadinessService } from './readiness.service';

@Module({
  controllers: [MetaController],
  providers: [ReadinessService],
})
export class MetaModule {}
