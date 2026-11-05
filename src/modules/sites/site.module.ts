import { Module } from '@nestjs/common';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
