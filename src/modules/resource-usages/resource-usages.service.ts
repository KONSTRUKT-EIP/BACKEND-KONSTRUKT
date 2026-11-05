import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { requireOrganizationId } from '../../shared/authorization/organization-scope';
import { CreateResourceUsageDto } from './dto/create-resource-usage.dto';
import { UpdateResourceUsageDto } from './dto/update-resource-usage.dto';
import { QueryResourceUsagesDto } from './dto/query-resource-usages.dto';

@Injectable()
export class ResourceUsagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryResourceUsagesDto, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ResourceUsageWhereInput = {
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      resource: {
        site: { organizationId: orgId },
        ...(query.siteId ? { siteId: query.siteId } : {}),
      },
    };

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.lte = endDate;
      }
      where.date = dateFilter;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.resourceUsage.findMany({
        where,
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              siteId: true,
              unit: true,
              unitPrice: true,
            },
          },
          task: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.resourceUsage.count({ where }),
    ]);

    return {
      data: data.map((usage) => ({
        ...usage,
        quantity: Number(usage.quantity),
        resource: {
          ...usage.resource,
          unitPrice: Number(usage.resource.unitPrice),
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const usage = await this.prisma.resourceUsage.findFirst({
      where: { id, resource: { site: { organizationId: orgId } } },
      include: {
        resource: true,
        task: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!usage) {
      throw new NotFoundException(`ResourceUsage ${id} introuvable`);
    }

    return {
      ...usage,
      quantity: Number(usage.quantity),
      resource: {
        ...usage.resource,
        quantity: Number(usage.resource.quantity),
        unitPrice: Number(usage.resource.unitPrice),
      },
    };
  }

  async create(
    dto: CreateResourceUsageDto,
    createdById: string,
    organizationId?: string | null,
  ) {
    await this.ensureResourceAndTask(
      dto.resourceId,
      dto.taskId,
      organizationId,
    );

    const created = await this.prisma.resourceUsage.create({
      data: {
        resourceId: dto.resourceId,
        taskId: dto.taskId,
        createdById,
        date: new Date(dto.date),
        quantity: dto.quantity,
        notes: dto.notes ?? '',
      },
      include: {
        resource: true,
        task: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      ...created,
      quantity: Number(created.quantity),
      resource: {
        ...created.resource,
        quantity: Number(created.resource.quantity),
        unitPrice: Number(created.resource.unitPrice),
      },
    };
  }

  async update(
    id: string,
    dto: UpdateResourceUsageDto,
    organizationId?: string | null,
  ) {
    const existing = await this.ensureExists(id, organizationId);
    if (dto.resourceId || dto.taskId) {
      await this.ensureResourceAndTask(
        dto.resourceId ?? existing.resourceId,
        dto.taskId ?? existing.taskId,
        organizationId,
      );
    }

    const updated = await this.prisma.resourceUsage.update({
      where: { id },
      data: {
        resourceId: dto.resourceId,
        taskId: dto.taskId,
        date: dto.date ? new Date(dto.date) : undefined,
        quantity: dto.quantity,
        notes: dto.notes,
      },
      include: {
        resource: true,
        task: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      ...updated,
      quantity: Number(updated.quantity),
      resource: {
        ...updated.resource,
        quantity: Number(updated.resource.quantity),
        unitPrice: Number(updated.resource.unitPrice),
      },
    };
  }

  async remove(id: string, organizationId?: string | null) {
    await this.ensureExists(id, organizationId);
    await this.prisma.resourceUsage.delete({ where: { id } });
    return { message: `ResourceUsage ${id} supprimee` };
  }

  private async ensureExists(id: string, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const usage = await this.prisma.resourceUsage.findFirst({
      where: { id, resource: { site: { organizationId: orgId } } },
    });
    if (!usage) {
      throw new NotFoundException(`ResourceUsage ${id} introuvable`);
    }
    return usage;
  }

  private async ensureResourceAndTask(
    resourceId: string,
    taskId: string,
    organizationId?: string | null,
  ) {
    const orgId = requireOrganizationId(organizationId);
    const [resource, task] = await this.prisma.$transaction([
      this.prisma.resource.findFirst({
        where: { id: resourceId, site: { organizationId: orgId } },
        select: { siteId: true },
      }),
      this.prisma.task.findFirst({
        where: { id: taskId, siteZone: { site: { organizationId: orgId } } },
        select: { siteZone: { select: { siteId: true } } },
      }),
    ]);

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} introuvable`);
    }
    if (!task) {
      throw new NotFoundException(`Task ${taskId} introuvable`);
    }
    if (task.siteZone?.siteId !== resource.siteId) {
      throw new BadRequestException(
        'La tache et la ressource doivent appartenir au meme chantier',
      );
    }
  }
}
