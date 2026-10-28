import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';
import { SiteZoneController } from './site-zone.controller';
import { SiteZoneService } from './site-zone.service';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [SiteZoneController],
  providers: [SiteZoneService],
  exports: [SiteZoneService],
})
export class SiteZoneModule {}
