import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { GenericTableService } from './generic-table.service';
import { GenericTableController } from './generic-table.controller';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [GenericTableController],
  providers: [GenericTableService],
  exports: [GenericTableService],
})
export class GenericTableModule {}
