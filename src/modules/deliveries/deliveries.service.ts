import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
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

  async findAll(query: QueryDeliveriesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhereFromQuery(query);

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

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { resource: true },
    });
    if (!delivery) {
      throw new NotFoundException(`Delivery ${id} introuvable`);
    }
    return this.mapDelivery(delivery);
  }

  async create(dto: CreateDeliveryDto) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: dto.resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${dto.resourceId} introuvable`);
    }

    const siteId = dto.siteId ?? resource.siteId;
    if (siteId !== resource.siteId) {
      throw new BadRequestException(
        'siteId doit correspondre au chantier de la ressource',
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

  async update(id: string, dto: UpdateDeliveryDto) {
    await this.ensureDeliveryExists(id);

    let resolvedResourceId = dto.resourceId;
    let resolvedSiteId = dto.siteId;

    if (dto.resourceId) {
      const nextResource = await this.prisma.resource.findUnique({
        where: { id: dto.resourceId },
      });
      if (!nextResource) {
        throw new NotFoundException(`Resource ${dto.resourceId} introuvable`);
      }

      if (dto.siteId && dto.siteId !== nextResource.siteId) {
        throw new BadRequestException(
          'siteId doit correspondre au chantier de la ressource',
        );
      }

      resolvedSiteId = dto.siteId ?? nextResource.siteId;
      resolvedResourceId = nextResource.id;
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        resourceId: resolvedResourceId,
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

  async updateStatus(id: string, dto: UpdateDeliveryStatusDto) {
    const current = await this.prisma.delivery.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!current) {
      throw new NotFoundException(`Delivery ${id} introuvable`);
    }

    if (!this.isStatusTransitionAllowed(current.status, dto.status)) {
      throw new BadRequestException(
        `Transition ${current.status} -> ${dto.status} non autorisee`,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: dto.status,
        receivedDate:
          dto.status === DeliveryStatus.LIVREE ||
          dto.status === DeliveryStatus.PARTIELLE
            ? dto.receivedDate
              ? new Date(dto.receivedDate)
              : new Date()
            : current.receivedDate,
      },
      include: { resource: true },
    });

    return this.mapDelivery(updated);
  }

  async remove(id: string) {
    await this.ensureDeliveryExists(id);
    await this.prisma.delivery.delete({ where: { id } });
    return { message: `Delivery ${id} supprimee` };
  }

  async getAllOrders(siteId?: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: siteId ? { siteId } : undefined,
      include: { resource: true },
      orderBy: { createdAt: 'desc' },
    });

    return { orders: deliveries.map((delivery) => this.mapOrder(delivery)) };
  }

  async getRecentOrders(query: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Prisma.DeliveryWhereInput = {};
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

  async createOrder(data: {
    siteId: string;
    productName: string;
    productIcon?: string;
    price: number;
    totalOrder: number;
    total: number;
   }) {
  const delivery = await this.prisma.delivery.create({
    data: {
      siteId: data.siteId,
      productName: data.productName,
      price: data.price,
      quantity: data.totalOrder,
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      supplier: 'Non defini',
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

  private async ensureDeliveryExists(id: string) {
    const existing = await this.prisma.delivery.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Delivery ${id} introuvable`);
    }
    return existing;
  }

  private buildWhereFromQuery(
    query: QueryDeliveriesDto,
  ): Prisma.DeliveryWhereInput {
    const where: Prisma.DeliveryWhereInput = {};

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

      where[dateField] = dateFilter;
    }

    return where;
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
    const quantity = Number(delivery.quantity);
    const unitPrice = delivery.price
      ? Number(delivery.price)
      : delivery.resource
        ? Number(delivery.resource.unitPrice)
        : 0;

    return {
      id: delivery.id,
      siteId: delivery.siteId,
      resourceId: delivery.resourceId,
      resourceName:
        delivery.productName ??
        delivery.resource?.name ??
        'Produit sans nom',
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
    const price = delivery.price
      ? Number(delivery.price)
      : delivery.resource
        ? Number(delivery.resource.unitPrice)
        : 0;

    return {
      id: delivery.id,
      productName:
        delivery.productName ??
        delivery.resource?.name ??
        'Produit sans nom',
      productIcon: '',
      price,
      totalOrder: Number(delivery.quantity),
      total: Number(delivery.quantity) * price,
    };
  }
}
