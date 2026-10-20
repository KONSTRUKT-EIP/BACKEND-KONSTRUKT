import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

type DeliveryWithResource = Prisma.DeliveryGetPayload<{
  include: { resource: true };
}>;

interface OrderProjection {
  id: string;
  productName: string;
  productIcon: string;
  price: number;
  totalOrder: number;
  total: number;
}

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDeliveriesDto, organizationId?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhereFromQuery(query, organizationId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        include: { resource: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: data.map((delivery) => this.mapDelivery(delivery)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, organizationId?: string | null) {
    const delivery = await this.findDeliveryInOrganization(id, organizationId);
    return this.mapDelivery(delivery);
  }

  async create(dto: CreateDeliveryDto, organizationId?: string | null) {
    const resource = await this.prisma.resource.findFirst({
      where: {
        id: dto.resourceId,
        site: { organizationId: organizationId ?? '__no_org__' },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Ressource ${dto.resourceId} introuvable`);
    }

    const siteId = dto.siteId ?? resource.siteId;
    if (siteId !== resource.siteId) {
      throw new BadRequestException(
        'Le site doit correspondre au chantier de la ressource',
      );
    }

    const status = dto.status ?? DeliveryStatus.PLANIFIEE;

    const created = await this.prisma.delivery.create({
      data: {
        resourceId: resource.id,
        siteId,
        expectedDate: new Date(dto.expectedDate),
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
        quantity: dto.quantity,
        status,
        supplier: dto.supplier ?? resource.supplier,
      },
      include: { resource: true },
    });

    return this.mapDelivery(created);
  }

  async update(
    id: string,
    dto: UpdateDeliveryDto,
    organizationId?: string | null,
  ) {
    const current = await this.findDeliveryInOrganization(id, organizationId);

    const resolvedResource = dto.resourceId
      ? await this.prisma.resource.findFirst({
          where: {
            id: dto.resourceId,
            site: { organizationId: organizationId ?? '__no_org__' },
          },
        })
      : current.resource;

    if (!resolvedResource) {
      throw new NotFoundException(
        `Ressource ${dto.resourceId ?? current.resourceId} introuvable`,
      );
    }

    const resolvedSiteId =
      dto.siteId ?? (dto.resourceId ? resolvedResource.siteId : current.siteId);

    if (resolvedSiteId !== resolvedResource.siteId) {
      throw new BadRequestException(
        'Le site doit correspondre au chantier de la ressource',
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        resourceId: resolvedResource.id,
        siteId: resolvedSiteId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
        quantity: dto.quantity,
        status: dto.status,
        supplier: dto.supplier,
      },
      include: { resource: true },
    });

    return this.mapDelivery(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateDeliveryStatusDto,
    organizationId?: string | null,
  ) {
    const current = await this.findDeliveryInOrganization(id, organizationId);

    if (!this.isStatusTransitionAllowed(current.status, dto.status)) {
      throw new BadRequestException(
        `Transition de ${current.status} vers ${dto.status} non autorisée`,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: dto.status,
        receivedDate: this.resolveReceivedDate(
          current.receivedDate,
          dto.status,
          dto.receivedDate,
        ),
      },
      include: { resource: true },
    });

    return this.mapDelivery(updated);
  }

  async remove(id: string, organizationId?: string | null) {
    await this.findDeliveryInOrganization(id, organizationId);
    await this.prisma.delivery.delete({ where: { id } });
    return { message: `Livraison ${id} supprimée` };
  }

  async getAllOrders(organizationId?: string | null) {
    const deliveries = await this.prisma.delivery.findMany({
      where: { site: { organizationId: organizationId ?? '__no_org__' } },
      include: { resource: true },
      orderBy: { createdAt: 'desc' },
    });

    return { orders: deliveries.map((delivery) => this.mapOrder(delivery)) };
  }

  async getRecentOrders(
    query: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    },
    organizationId?: string | null,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Prisma.DeliveryWhereInput = {
      site: { organizationId: organizationId ?? '__no_org__' },
    };

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        createdAt.lte = endDate;
      }
      where.createdAt = createdAt;
    }

    const deliveries = await this.prisma.delivery.findMany({
      where,
      include: { resource: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { orders: deliveries.map((delivery) => this.mapOrder(delivery)) };
  }

  async createOrder(
    data: {
      productName: string;
      productIcon?: string;
      price: number;
      totalOrder: number;
      total: number;
    },
    organizationId?: string | null,
  ) {
    const resource = await this.prisma.resource.findFirst({
      where: {
        name: { contains: data.productName, mode: 'insensitive' },
        site: { organizationId: organizationId ?? '__no_org__' },
      },
    });

    if (!resource) {
      throw new NotFoundException(
        `Aucune ressource correspondante pour ${data.productName}`,
      );
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        resourceId: resource.id,
        siteId: resource.siteId,
        quantity: data.totalOrder,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        supplier: resource.supplier,
        status: DeliveryStatus.PLANIFIEE,
      },
      include: { resource: true },
    });

    return {
      orders: [
        {
          ...this.mapOrder(delivery),
          productIcon: data.productIcon ?? '',
        },
      ],
    };
  }

  private async findDeliveryInOrganization(
    id: string,
    organizationId?: string | null,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        site: { organizationId: organizationId ?? '__no_org__' },
      },
      include: { resource: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Livraison ${id} introuvable`);
    }

    return delivery;
  }

  private buildWhereFromQuery(
    query: QueryDeliveriesDto,
    organizationId?: string | null,
  ): Prisma.DeliveryWhereInput {
    const where: Prisma.DeliveryWhereInput = {
      site: { organizationId: organizationId ?? '__no_org__' },
    };

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const dateField = query.dateField ?? 'createdAt';
      const dateFilter: Prisma.DateTimeFilter = {};

      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }

      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.lte = endDate;
      }

      switch (dateField) {
        case 'createdAt':
          where.createdAt = dateFilter;
          break;
        case 'expectedDate':
          where.expectedDate = dateFilter;
          break;
        case 'receivedDate':
          where.receivedDate = dateFilter;
          break;
      }
    }

    return where;
  }

  private resolveReceivedDate(
    currentReceivedDate: Date | null,
    status: DeliveryStatus,
    receivedDate?: string,
  ) {
    if (
      status !== DeliveryStatus.LIVREE &&
      status !== DeliveryStatus.PARTIELLE
    ) {
      return currentReceivedDate;
    }

    if (receivedDate) {
      return new Date(receivedDate);
    }

    return currentReceivedDate ?? new Date();
  }

  private isStatusTransitionAllowed(
    from: DeliveryStatus,
    to: DeliveryStatus,
  ): boolean {
    if (from === to) {
      return true;
    }

    const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.PLANIFIEE]: [
        DeliveryStatus.EN_TRANSIT,
        DeliveryStatus.ANNULEE,
      ],
      [DeliveryStatus.EN_TRANSIT]: [
        DeliveryStatus.PARTIELLE,
        DeliveryStatus.LIVREE,
        DeliveryStatus.ANNULEE,
      ],
      [DeliveryStatus.PARTIELLE]: [
        DeliveryStatus.EN_TRANSIT,
        DeliveryStatus.LIVREE,
        DeliveryStatus.ANNULEE,
      ],
      [DeliveryStatus.LIVREE]: [],
      [DeliveryStatus.ANNULEE]: [],
    };

    return transitions[from].includes(to);
  }

  private mapDelivery(delivery: DeliveryWithResource) {
    const unitPrice = Number(delivery.resource.unitPrice);
    const quantity = Number(delivery.quantity);

    return {
      id: delivery.id,
      siteId: delivery.siteId,
      resourceId: delivery.resourceId,
      resourceName: delivery.resource.name,
      expectedDate: delivery.expectedDate,
      receivedDate: delivery.receivedDate,
      quantity,
      status: delivery.status,
      supplier: delivery.supplier,
      createdAt: delivery.createdAt,
      price: unitPrice,
      total: unitPrice * quantity,
    };
  }

  private mapOrder(delivery: DeliveryWithResource): OrderProjection {
    return {
      id: delivery.id,
      productName: delivery.resource.name,
      productIcon: '',
      price: Number(delivery.resource.unitPrice),
      totalOrder: Number(delivery.quantity),
      total: Number(delivery.quantity) * Number(delivery.resource.unitPrice),
    };
  }
}
