import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from '../../../src/modules/deliveries/deliveries.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: {
    delivery: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    resource: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const organizationId = 'org-a';
  const now = new Date('2026-10-14T12:00:00.000Z');

  const resource = {
    id: 'resource-1',
    siteId: 'site-1',
    name: 'Ciment 25kg',
    unitPrice: 12.5,
    supplier: 'Fournisseur SA',
  };

  const delivery = {
    id: 'delivery-1',
    siteId: 'site-1',
    resourceId: 'resource-1',
    expectedDate: new Date('2026-10-20T00:00:00.000Z'),
    receivedDate: null,
    quantity: 10,
    status: DeliveryStatus.PLANIFIEE,
    supplier: 'Fournisseur SA',
    createdAt: new Date('2026-10-10T00:00:00.000Z'),
    resource,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma = {
      delivery: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      resource: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };

    service = new DeliveriesService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('updateStatus()', () => {
    it('autorise une transition valide', async () => {
      prisma.delivery.findFirst.mockResolvedValue(delivery);
      prisma.delivery.update.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.EN_TRANSIT,
      });

      await service.updateStatus(
        'delivery-1',
        { status: DeliveryStatus.EN_TRANSIT },
        organizationId,
      );

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'delivery-1' },
          data: expect.objectContaining({
            status: DeliveryStatus.EN_TRANSIT,
          }),
        }),
      );
    });

    it('refuse une transition interdite', async () => {
      prisma.delivery.findFirst.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.LIVREE,
      });

      await expect(
        service.updateStatus(
          'delivery-1',
          { status: DeliveryStatus.EN_TRANSIT },
          organizationId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('utilise receivedDate fourni pour LIVREE', async () => {
      prisma.delivery.findFirst.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.EN_TRANSIT,
      });
      prisma.delivery.update.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.LIVREE,
        receivedDate: new Date('2026-10-12T08:00:00.000Z'),
      });

      await service.updateStatus(
        'delivery-1',
        {
          status: DeliveryStatus.LIVREE,
          receivedDate: '2026-10-12T08:00:00.000Z',
        },
        organizationId,
      );

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedDate: new Date('2026-10-12T08:00:00.000Z'),
          }),
        }),
      );
    });

    it('utilise la date courante pour PARTIELLE quand aucune date n’est fournie', async () => {
      prisma.delivery.findFirst.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.EN_TRANSIT,
      });
      prisma.delivery.update.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.PARTIELLE,
        receivedDate: now,
      });

      await service.updateStatus(
        'delivery-1',
        { status: DeliveryStatus.PARTIELLE },
        organizationId,
      );

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedDate: now,
          }),
        }),
      );
    });

    it('préserve receivedDate lors d’un changement de statut', async () => {
      prisma.delivery.findFirst.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.PARTIELLE,
        receivedDate: new Date('2026-10-11T09:00:00.000Z'),
      });
      prisma.delivery.update.mockResolvedValue({
        ...delivery,
        status: DeliveryStatus.EN_TRANSIT,
        receivedDate: new Date('2026-10-11T09:00:00.000Z'),
      });

      await service.updateStatus(
        'delivery-1',
        { status: DeliveryStatus.EN_TRANSIT },
        organizationId,
      );

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedDate: new Date('2026-10-11T09:00:00.000Z'),
          }),
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('lève une erreur quand la livraison est introuvable', async () => {
      prisma.delivery.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('delivery-1', organizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});