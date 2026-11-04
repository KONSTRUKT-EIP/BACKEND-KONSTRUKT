import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [LotsController],
  providers: [LotsService],
})
export class LotsModule {}
