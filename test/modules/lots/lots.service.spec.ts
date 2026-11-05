import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LotsService } from '../../../src/modules/lots/lots.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('LotsService', () => {
  let service: LotsService;
  let lotFindMany: jest.Mock;
  let lotFindUnique: jest.Mock;

  const dec = (value: number) => new Prisma.Decimal(value);

  beforeEach(() => {
    lotFindMany = jest.fn();
    lotFindUnique = jest.fn();
    service = new LotsService({
      lot: { findMany: lotFindMany, findUnique: lotFindUnique },
    } as unknown as PrismaService);
  });

  it('lists the lots of a site with their delivered progress', async () => {
    lotFindMany.mockResolvedValue([
      {
        id: 'lot-1',
        key: 'armature',
        label: 'Armature',
        description: 'Voiles, planchers, poutres',
        plans: [
          { planned: dec(10), actual: dec(6) },
          { planned: dec(10), actual: null },
        ],
      },
      {
        id: 'lot-2',
        key: 'finitions',
        label: 'Finitions',
        description: 'Peinture',
        plans: [],
      },
    ]);

    const result = await service.findAll('site-1');

    expect(lotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'site-1' } }) as unknown,
    );
    expect(result).toEqual([
      {
        id: 'lot-1',
        key: 'armature',
        label: 'Armature',
        description: 'Voiles, planchers, poutres',
        plansCount: 2,
        progressPct: 30,
      },
      {
        id: 'lot-2',
        key: 'finitions',
        label: 'Finitions',
        description: 'Peinture',
        plansCount: 0,
        progressPct: 0,
      },
    ]);
  });

  it('returns a lot with numeric quantities and ISO dates', async () => {
    lotFindUnique.mockResolvedValue({
      id: 'lot-1',
      key: 'armature',
      label: 'Armature',
      description: 'Voiles',
      title: 'Armatures HA',
      subcontractor: 'Steel Pose',
      marketLabel: 'Marché HA',
      marketAmount: dec(638788.2),
      marketQuantity: dec(462.89),
      unit: 'T',
      quantityLabel: 'Poids',
      deliveredLabel: 'Poids livré',
      unitPrice: dec(1380),
      remainingShipmentsNote: null,
      plans: [
        {
          id: 'plan-1',
          name: 'Poutres Bât A',
          level: 'PH SS1',
          number: '132',
          index: 'A',
          planned: dec(12.21),
          actual: null,
          sentDate: new Date('2026-09-20T00:00:00.000Z'),
          deliveryFrom: new Date('2026-11-17T00:00:00.000Z'),
          deliveryTo: null,
          status: 'TRANSMIS',
        },
      ],
      shipments: [
        {
          id: 'ship-1',
          name: 'Toiture Bât B',
          plannedDate: new Date('2027-04-04T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.findOne('site-1', 'armature');

    expect(lotFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId_key: { siteId: 'site-1', key: 'armature' } },
      }) as unknown,
    );
    expect(result.marketAmount).toBe(638788.2);
    expect(result.unitPrice).toBe(1380);
    expect(result.plans[0]).toMatchObject({
      planned: 12.21,
      actual: null,
      sentDate: '2026-09-20',
      deliveryFrom: '2026-11-17',
      deliveryTo: null,
    });
    expect(result.nextShipments).toEqual([
      { id: 'ship-1', name: 'Toiture Bât B', date: '2027-04-04' },
    ]);
  });

  it('throws 404 when the lot does not exist on the site', async () => {
    lotFindUnique.mockResolvedValue(null);

    await expect(service.findOne('site-1', 'inconnu')).rejects.toThrow(
      NotFoundException,
    );
  });
});
