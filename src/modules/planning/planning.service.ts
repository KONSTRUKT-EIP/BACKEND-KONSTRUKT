import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreatePlanningTaskDto } from './dto/create-planning-task.dto';
import { UpdatePlanningTaskDto } from './dto/update-planning-task.dto';
import {
  PlanningTaskResponseDto,
  PlanningTaskStatus,
} from './dto/planning-task-response.dto';
import {
  PlanningActionResponseDto,
  ActionBadge,
} from './dto/planning-action-response.dto';
import {
  WeekPlanningResponseDto,
  WeekPlanningStatsDto,
} from './dto/week-planning-response.dto';
import { TaskStatus, AlertType, AlertSeverity, TaskType } from '@prisma/client';

interface TaskWithRelations {
  id: string;
  name: string;
  plannedEnd: Date;
  status: TaskStatus;
  time?: string;
  alerts?: Array<{
    id: string;
    type: AlertType;
    message: string;
  }>;
}

interface AlertWithTask {
  id: string;
  type: AlertType;
  message: string;
  task?: {
    name?: string;
    siteZone?: {
      name?: string;
    };
  };
}

interface TaskUpdateData {
  siteZoneId?: string;
  assignedToId?: string;
  name?: string;
  description?: string;
  type?: TaskType;
  priority?: number;
  plannedEnd?: Date;
  status?: TaskStatus;
  realStart?: Date;
  realEnd?: Date;
}

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTaskStatus(
    task: TaskWithRelations,
    hasWeatherAlert: boolean = false,
  ): PlanningTaskStatus {
    if (task.status === TaskStatus.TERMINEE) {
      return 'done';
    }
    if (hasWeatherAlert) {
      return 'weather-risk';
    }
    const now = new Date();
    const plannedEnd = new Date(task.plannedEnd);
    if (plannedEnd < now) {
      return 'late';
    }
    return 'in-progress';
  }

  private formatTaskForFrontend(
    task: TaskWithRelations,
  ): PlanningTaskResponseDto {
    const hasWeatherAlert =
      task.alerts?.some(
        (alert) =>
          alert.type === AlertType.AUTRE && alert.message.includes('météo'),
      ) ?? false;

    return {
      id: task.id,
      label: task.name,
      date: new Date(task.plannedEnd).toISOString().split('T')[0],
      time: task.time || undefined,
      status: this.mapTaskStatus(task, hasWeatherAlert),
    };
  }

  private mapAlertToAction(alert: AlertWithTask): PlanningActionResponseDto {
    let icon = '⚠️';
    let iconBg = 'bg-orange-50';
    let badge: ActionBadge = 'À risque';

    if (alert.type === AlertType.RETARD) {
      icon = '⏰';
      iconBg = 'bg-red-50';
      badge = 'En retard';
    } else if (
      alert.type === AlertType.AUTRE &&
      alert.message.includes('météo')
    ) {
      icon = '🌧️';
      iconBg = 'bg-blue-50';
      badge = 'À décaler';
    }

    return {
      id: alert.id,
      icon,
      iconBg,
      label: alert.task?.name || 'Tâche inconnue',
      sublabel: alert.task?.siteZone?.name || 'Zone inconnue',
      sublabelIcon: '📍',
      badge,
    };
  }

  async findAll(
    startDate?: string,
    endDate?: string,
    siteZoneId?: string,
    status?: TaskStatus,
  ): Promise<PlanningTaskResponseDto[]> {
    const where: {
      plannedEnd?: { gte: Date; lte: Date };
      siteZoneId?: string;
      status?: TaskStatus;
    } = {};

    if (startDate && endDate) {
      where.plannedEnd = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (siteZoneId) {
      where.siteZoneId = siteZoneId;
    }

    if (status) {
      where.status = status;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        alerts: {
          where: {
            isRead: false,
          },
          select: {
            id: true,
            type: true,
            message: true,
          },
        },
      },
      orderBy: { plannedEnd: 'asc' },
    });

    return tasks.map((task) => this.formatTaskForFrontend(task));
  }

  async findOne(id: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        alerts: {
          select: {
            id: true,
            type: true,
            severity: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        progress: {
          select: {
            id: true,
            date: true,
            progressPercent: true,
            notes: true,
            reportedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Tâche ${id} introuvable`);
    }

    return task;
  }

  async create(dto: CreatePlanningTaskDto): Promise<any> {
    const siteZone = await this.prisma.siteZone.findUnique({
      where: { id: dto.siteZoneId },
    });

    if (!siteZone) {
      throw new NotFoundException(
        `Zone de chantier ${dto.siteZoneId} introuvable`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
    });

    if (!user) {
      throw new NotFoundException(
        `Utilisateur ${dto.assignedToId} introuvable`,
      );
    }

    const task = await this.prisma.task.create({
      data: {
        siteZoneId: dto.siteZoneId,
        assignedToId: dto.assignedToId,
        name: dto.name,
        description: dto.description || '',
        type: dto.type,
        priority: dto.priority,
        plannedEnd: new Date(dto.plannedEnd),
        status: TaskStatus.EN_ATTENTE,
      },
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return task;
  }

  async update(id: string, dto: UpdatePlanningTaskDto): Promise<any> {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });
    if (!existingTask) {
      throw new NotFoundException(`Tâche ${id} introuvable`);
    }
    const updateData: TaskUpdateData = {};

    if (typeof dto.siteZoneId !== 'undefined') {
      const siteZone = await this.prisma.siteZone.findUnique({
        where: { id: dto.siteZoneId },
      });
      if (!siteZone) {
        throw new NotFoundException(
          `Zone de chantier ${dto.siteZoneId} introuvable`,
        );
      }
      updateData.siteZoneId = dto.siteZoneId;
    }

    if (typeof dto.assignedToId !== 'undefined') {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!user) {
        throw new NotFoundException(
          `Utilisateur ${dto.assignedToId} introuvable`,
        );
      }
      updateData.assignedToId = dto.assignedToId;
    }

    if (typeof dto.name !== 'undefined') {
      updateData.name = dto.name;
    }
    if (typeof dto.description !== 'undefined') {
      updateData.description = dto.description;
    }
    if (typeof dto.type !== 'undefined') {
      updateData.type = dto.type;
    }
    if (typeof dto.priority !== 'undefined') {
      updateData.priority = dto.priority;
    }
    if (typeof dto.plannedEnd !== 'undefined') {
      updateData.plannedEnd = new Date(dto.plannedEnd);
    }
    if (typeof dto.status !== 'undefined') {
      updateData.status = dto.status;
    }
    if (typeof dto.realStart !== 'undefined') {
      updateData.realStart = new Date(dto.realStart);
    }
    if (typeof dto.realEnd !== 'undefined') {
      updateData.realEnd = new Date(dto.realEnd);
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    return task;
  }

  async remove(id: string): Promise<{ message: string }> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException(`Tâche ${id} introuvable`);
    }
    await this.prisma.task.delete({
      where: { id },
    });
    return { message: `Tâche ${id} supprimée avec succès` };
  }

  async findActions(): Promise<PlanningActionResponseDto[]> {
    const alerts = await this.prisma.taskAlert.findMany({
      where: {
        isRead: false,
        severity: {
          in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        },
      },
      include: {
        task: {
          include: {
            siteZone: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    return alerts.map((alert) => this.mapAlertToAction(alert));
  }

  async getWeekPlanning(
    startDate: string,
    endDate: string,
  ): Promise<WeekPlanningResponseDto> {
    const tasks = await this.findAll(startDate, endDate);
    const actions = await this.findActions();
    const stats: WeekPlanningStatsDto = {
      tasksThisWeek: tasks.length,
      tasksLate: tasks.filter((t) => t.status === 'late').length,
      tasksWeatherRisk: tasks.filter((t) => t.status === 'weather-risk').length,
    };

    return {
      tasks,
      actions,
      stats,
    };
  }

  async findTaskActions(taskId: string): Promise<PlanningActionResponseDto[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Tâche ${taskId} introuvable`);
    }

    const alerts = await this.prisma.taskAlert.findMany({
      where: {
        taskId,
        isRead: false,
      },
      include: {
        task: {
          include: {
            siteZone: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    return alerts.map((alert) => this.mapAlertToAction(alert));
  }

  async createTaskAction(
    taskId: string,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
  ): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Tâche ${taskId} introuvable`);
    }

    const alert = await this.prisma.taskAlert.create({
      data: {
        taskId,
        type,
        severity,
        message,
        isRead: false,
      },
    });

    return alert;
  }

  async removeAction(actionId: string): Promise<{ message: string }> {
    const alert = await this.prisma.taskAlert.findUnique({
      where: { id: actionId },
    });

    if (!alert) {
      throw new NotFoundException(`Action ${actionId} introuvable`);
    }

    await this.prisma.taskAlert.update({
      where: { id: actionId },
      data: { isRead: true },
    });

    return { message: `Action ${actionId} marquée comme lue` };
  }
}
