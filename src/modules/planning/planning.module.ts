import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { TaskAlertController } from './task-alert.controller';
import { TaskAlertService } from './task-alert.service';
import { TaskDelayAlertService } from './task-delay-alert.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskAlertController, PlanningController],
  providers: [PlanningService, TaskAlertService, TaskDelayAlertService],
  exports: [PlanningService],
})
export class PlanningModule {}
