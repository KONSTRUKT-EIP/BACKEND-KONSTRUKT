import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { requireOrganizationId } from '../../shared/authorization/organization-scope';
import { QueryTaskAlertsDto } from './dto/query-task-alerts.dto';

@Injectable()
export class TaskAlertService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTaskAlertsDto, organizationId?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(organizationId, query.siteId);
    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.taskAlert.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              siteZone: { select: { id: true, name: true, siteId: true } },
            },
          },
        },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.taskAlert.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async markAsRead(id: string, organizationId?: string | null) {
    const alert = await this.prisma.taskAlert.findFirst({
      where: { id, ...this.buildWhere(organizationId) },
      select: { id: true },
    });
    if (!alert) {
      throw new NotFoundException(`Alerte ${id} introuvable`);
    }

    return this.prisma.taskAlert.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(organizationId?: string | null, siteId?: string) {
    const { count } = await this.prisma.taskAlert.updateMany({
      where: { ...this.buildWhere(organizationId, siteId), isRead: false },
      data: { isRead: true },
    });
    return { updated: count };
  }

  private buildWhere(
    organizationId?: string | null,
    siteId?: string,
  ): Prisma.TaskAlertWhereInput {
    const orgId = requireOrganizationId(organizationId);
    return {
      task: {
        siteZone: {
          site: { organizationId: orgId },
          ...(siteId ? { siteId } : {}),
        },
      },
    };
  }
}
