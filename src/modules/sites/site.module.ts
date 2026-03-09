import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { PrismaModule } from '../../lib/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
