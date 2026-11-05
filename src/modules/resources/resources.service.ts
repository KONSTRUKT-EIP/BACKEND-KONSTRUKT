import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { requireOrganizationId } from '../../shared/authorization/organization-scope';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { QueryResourcesDto } from './dto/query-resources.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryResourcesDto, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ResourceWhereInput = {
      site: { organizationId: orgId },
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.supplier ? { supplier: query.supplier } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      data: data.map((resource) => ({
        ...resource,
        quantity: Number(resource.quantity),
        unitPrice: Number(resource.unitPrice),
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const resource = await this.prisma.resource.findFirst({
      where: { id, site: { organizationId: orgId } },
      include: {
        site: { select: { id: true, name: true, budget: true } },
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        usages: {
          orderBy: { date: 'desc' },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                siteZone: {
                  select: {
                    id: true,
                    name: true,
                    siteId: true,
                  },
                },
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
          take: 100,
        },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${id} introuvable`);
    }

    const totalUsed = resource.usages.reduce(
      (acc, usage) => acc + Number(usage.quantity),
      0,
    );
    const unitPrice = Number(resource.unitPrice);
    const totalAllocated = Number(resource.quantity);

    return {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      unit: resource.unit,
      quantity: totalAllocated,
      unitPrice,
      supplier: resource.supplier,
      createdAt: resource.createdAt,
      site: {
        id: resource.site.id,
        name: resource.site.name,
        budget: Number(resource.site.budget),
      },
      deliveries: resource.deliveries.map((delivery) => ({
        ...delivery,
        quantity: Number(delivery.quantity),
      })),
      usages: resource.usages.map((usage) => ({
        ...usage,
        quantity: Number(usage.quantity),
      })),
      consumption: {
        totalUsed,
        totalCostUsed: totalUsed * unitPrice,
        remainingQuantity: Math.max(0, totalAllocated - totalUsed),
      },
    };
  }

  async create(dto: CreateResourceDto, organizationId?: string | null) {
    await this.ensureSiteInOrganization(dto.siteId, organizationId);
    const created = await this.prisma.resource.create({
      data: dto,
    });

    return {
      ...created,
      quantity: Number(created.quantity),
      unitPrice: Number(created.unitPrice),
    };
  }

  async update(
    id: string,
    dto: UpdateResourceDto,
    organizationId?: string | null,
  ) {
    await this.ensureExists(id, organizationId);
    if (dto.siteId) {
      await this.ensureSiteInOrganization(dto.siteId, organizationId);
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: dto,
    });

    return {
      ...updated,
      quantity: Number(updated.quantity),
      unitPrice: Number(updated.unitPrice),
    };
  }

  async remove(id: string, organizationId?: string | null) {
    await this.ensureExists(id, organizationId);
    await this.prisma.resource.delete({ where: { id } });
    return { message: `Resource ${id} supprimee` };
  }

  private async ensureExists(id: string, organizationId?: string | null) {
    const orgId = requireOrganizationId(organizationId);
    const resource = await this.prisma.resource.findFirst({
      where: { id, site: { organizationId: orgId } },
    });
    if (!resource) {
      throw new NotFoundException(`Resource ${id} introuvable`);
    }
  }

  private async ensureSiteInOrganization(
    siteId: string,
    organizationId?: string | null,
  ) {
    const orgId = requireOrganizationId(organizationId);
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException(`Site ${siteId} introuvable`);
    }
  }
}
