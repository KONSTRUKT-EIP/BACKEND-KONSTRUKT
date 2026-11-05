import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';

const toNumber = (value: Prisma.Decimal | null) =>
  value === null ? null : Number(value);

// Les colonnes @db.Date sont renvoyées au format YYYY-MM-DD
const toDateKey = (value: Date | null) =>
  value === null ? null : value.toISOString().slice(0, 10);

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string) {
    const lots = await this.prisma.lot.findMany({
      where: { siteId },
      orderBy: [{ position: 'asc' }, { label: 'asc' }],
      include: { plans: { select: { planned: true, actual: true } } },
    });

    return lots.map((lot) => {
      const planned = lot.plans.reduce((sum, p) => sum + Number(p.planned), 0);
      const actual = lot.plans.reduce(
        (sum, p) => sum + Number(p.actual ?? 0),
        0,
      );
      return {
        id: lot.id,
        key: lot.key,
        label: lot.label,
        description: lot.description,
        plansCount: lot.plans.length,
        // Avancement = quantité livrée sur la quantité prévue des plans diffusés
        progressPct: planned > 0 ? Math.round((actual / planned) * 100) : 0,
      };
    });
  }

  async findOne(siteId: string, key: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { siteId_key: { siteId, key } },
      include: {
        plans: { orderBy: [{ position: 'asc' }, { deliveryFrom: 'asc' }] },
        shipments: {
          where: { sentAt: null },
          orderBy: { plannedDate: 'asc' },
        },
      },
    });
    if (!lot) {
      throw new NotFoundException(`Lot ${key} introuvable sur ce chantier`);
    }

    return {
      id: lot.id,
      key: lot.key,
      label: lot.label,
      description: lot.description,
      title: lot.title,
      subcontractor: lot.subcontractor,
      marketLabel: lot.marketLabel,
      marketAmount: Number(lot.marketAmount),
      marketQuantity: Number(lot.marketQuantity),
      unit: lot.unit,
      quantityLabel: lot.quantityLabel,
      deliveredLabel: lot.deliveredLabel,
      unitPrice: Number(lot.unitPrice),
      remainingShipmentsNote: lot.remainingShipmentsNote,
      plans: lot.plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        level: plan.level,
        number: plan.number,
        index: plan.index,
        planned: Number(plan.planned),
        actual: toNumber(plan.actual),
        sentDate: toDateKey(plan.sentDate),
        deliveryFrom: toDateKey(plan.deliveryFrom),
        deliveryTo: toDateKey(plan.deliveryTo),
        status: plan.status,
      })),
      nextShipments: lot.shipments.map((shipment) => ({
        id: shipment.id,
        name: shipment.name,
        date: toDateKey(shipment.plannedDate),
      })),
    };
  }
}
