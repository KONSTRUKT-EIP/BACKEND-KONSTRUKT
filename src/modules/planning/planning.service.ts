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
  time?: string | null;
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
    } | null;
  };
}

interface TaskUpdateData {
  siteZoneId?: string;
  name?: string;
  description?: string;
  type?: TaskType;
  priority?: number;
  plannedEnd?: Date;
  status?: TaskStatus;
  realStart?: Date;
  realEnd?: Date;
  time?: string;
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

  private formatDateLocal(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
      date: this.formatDateLocal(new Date(task.plannedEnd)),
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
    organizationId?: string | null,
  ): Promise<PlanningTaskResponseDto[]> {
    if (!organizationId) return [];
    const where: {
      plannedEnd?: { gte: Date; lte: Date };
      siteZoneId?: string;
      status?: TaskStatus;
      siteZone?: { site: { organizationId: string } };
    } = {};
    where.siteZone = { site: { organizationId } };

    if (startDate && endDate) {
      const gteDate = new Date(startDate);
      const lteDate = new Date(endDate);
      lteDate.setHours(23, 59, 59, 999);
      where.plannedEnd = {
        gte: gteDate,
        lte: lteDate,
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
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
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

  async findOne(id: string, organizationId?: string | null): Promise<any> {
    const task = await this.prisma.task.findFirst({
      where: { id, siteZone: { site: { organizationId: organizationId ?? '' } } },
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
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

  async create(dto: CreatePlanningTaskDto, organizationId?: string | null): Promise<any> {
    if (!organizationId || !dto.siteZoneId) {
      throw new NotFoundException(`Zone de chantier ${dto.siteZoneId ?? ''} introuvable`);
    }
    if (dto.siteZoneId) {
      const siteZone = await this.prisma.siteZone.findFirst({
        where: { id: dto.siteZoneId, site: { organizationId } },
      });

      if (!siteZone) {
        throw new NotFoundException(
          `Zone de chantier ${dto.siteZoneId} introuvable`,
        );
      }
    }

    if (dto.assignedToIds && dto.assignedToIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.assignedToIds }, organizationId },
      });

      if (users.length !== dto.assignedToIds.length) {
        const foundIds = users.map((u) => u.id);
        const missingIds = dto.assignedToIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Utilisateur(s) introuvable(s): ${missingIds.join(', ')}`,
        );
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...(dto.siteZoneId ? { siteZoneId: dto.siteZoneId } : {}),
        name: dto.name,
        description: dto.description || '',
        type: dto.type,
        priority: dto.priority,
        plannedEnd: new Date(dto.plannedEnd),
        time: dto.time || null,
        status: TaskStatus.EN_ATTENTE,
        ...(dto.assignedToIds && dto.assignedToIds.length > 0
          ? {
              assignments: {
                create: dto.assignedToIds.map((userId) => ({
                  userId,
                })),
              },
            }
          : {}),
      },
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return task;
  }

  async update(id: string, dto: UpdatePlanningTaskDto, organizationId?: string | null): Promise<any> {
    const existingTask = await this.prisma.task.findFirst({
      where: { id, siteZone: { site: { organizationId: organizationId ?? '' } } },
    });
    if (!existingTask) {
      throw new NotFoundException(`Tâche ${id} introuvable`);
    }
    const updateData: TaskUpdateData = {};

    if (typeof dto.siteZoneId !== 'undefined') {
      const siteZone = await this.prisma.siteZone.findFirst({
        where: { id: dto.siteZoneId, site: { organizationId: organizationId ?? '' } },
      });
      if (!siteZone) {
        throw new NotFoundException(
          `Zone de chantier ${dto.siteZoneId} introuvable`,
        );
      }
      updateData.siteZoneId = dto.siteZoneId;
    }

    if (typeof dto.assignedToIds !== 'undefined') {
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.assignedToIds }, organizationId: organizationId ?? '' },
      });

      if (users.length !== dto.assignedToIds.length) {
        const foundIds = users.map((u) => u.id);
        const missingIds = dto.assignedToIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Utilisateur(s) introuvable(s): ${missingIds.join(', ')}`,
        );
      }

      await this.prisma.taskAssignment.deleteMany({
        where: { taskId: id },
      });

      await this.prisma.taskAssignment.createMany({
        data: dto.assignedToIds.map((userId) => ({
          taskId: id,
          userId,
        })),
      });
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
    if (typeof dto.time !== 'undefined') {
      updateData.time = dto.time || undefined;
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        siteZone: {
          select: { id: true, name: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    return task;
  }

  async remove(id: string, organizationId?: string | null): Promise<{ message: string }> {
    const task = await this.prisma.task.findFirst({
      where: { id, siteZone: { site: { organizationId: organizationId ?? '' } } },
    });
    if (!task) {
      throw new NotFoundException(`Tâche ${id} introuvable`);
    }
    await this.prisma.task.delete({
      where: { id },
    });
    return { message: `Tâche ${id} supprimée avec succès` };
  }

  async findActions(organizationId?: string | null): Promise<PlanningActionResponseDto[]> {
    if (!organizationId) return [];
    const alerts = await this.prisma.taskAlert.findMany({
      where: {
        isRead: false,
        severity: {
          in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        },
        task: { siteZone: { site: { organizationId } } },
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
    organizationId?: string | null,
  ): Promise<WeekPlanningResponseDto> {
    const tasks = await this.findAll(startDate, endDate, undefined, undefined, organizationId);
    const actions = await this.findActions(organizationId);
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

  async findTaskActions(taskId: string, organizationId?: string | null): Promise<PlanningActionResponseDto[]> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, siteZone: { site: { organizationId: organizationId ?? '' } } },
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

  async removeAction(actionId: string, organizationId?: string | null): Promise<{ message: string }> {
    const alert = await this.prisma.taskAlert.findFirst({
      where: { id: actionId, task: { siteZone: { site: { organizationId: organizationId ?? '' } } } },
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
