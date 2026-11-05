import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertSeverity, AlertType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';

const OPEN_TASK_STATUSES = [
  TaskStatus.EN_ATTENTE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_PAUSE,
];

@Injectable()
export class TaskDelayAlertService {
  private readonly logger = new Logger(TaskDelayAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkDelayedTasks(now = new Date()): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { in: OPEN_TASK_STATUSES },
        plannedEnd: { lt: now },
        realEnd: null,
        alerts: { none: { type: AlertType.RETARD, isRead: false } },
      },
      select: { id: true, name: true, plannedEnd: true },
    });

    for (const task of tasks) {
      await this.prisma.taskAlert.create({
        data: {
          taskId: task.id,
          type: AlertType.RETARD,
          severity: AlertSeverity.HIGH,
          message: `La tâche "${task.name}" devait se terminer le ${task.plannedEnd.toLocaleDateString('fr-FR')}`,
        },
      });
    }

    this.logger.log(`${tasks.length} alerte(s) de retard créée(s)`);
    return tasks.length;
  }
}
