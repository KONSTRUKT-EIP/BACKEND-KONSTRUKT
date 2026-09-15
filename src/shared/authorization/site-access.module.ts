import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessGuard } from './site-access.guard';
import { SiteAccessService } from './site-access.service';

@Module({
  imports: [PrismaModule],
  providers: [SiteAccessGuard, SiteAccessService],
  exports: [SiteAccessGuard, SiteAccessService],
})
export class SiteAccessModule {}
