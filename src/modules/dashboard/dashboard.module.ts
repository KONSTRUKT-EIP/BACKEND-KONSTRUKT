import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { GenericTableModule } from './generic-table.module';

@Module({
  imports: [PrismaModule, GenericTableModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
