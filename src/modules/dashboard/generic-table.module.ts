import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { GenericTableService } from './generic-table.service';
import { GenericTableController } from './generic-table.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GenericTableController],
  providers: [GenericTableService],
  exports: [GenericTableService],
})
export class GenericTableModule {}
