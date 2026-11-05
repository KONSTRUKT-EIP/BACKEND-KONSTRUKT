import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { ResourcesService } from '../../../src/modules/resources/resources.service';
import { ResourceUsagesService } from '../../../src/modules/resource-usages/resource-usages.service';
import { DeliveriesService } from '../../../src/modules/deliveries/deliveries.service';

const orgId = 'org-1';

function createPrisma() {
  const prisma = {
    site: { findFirst: jest.fn() },
    resource: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
    task: { findFirst: jest.fn() },
    resourceUsage: { findFirst: jest.fn(), create: jest.fn() },
    delivery: { findFirst: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return prisma;
}

describe('organization scoping', () => {
  describe('ResourcesService', () => {
    it('requires an organization context', async () => {
      const service = new ResourcesService(createPrisma() as never);
      await expect(service.findAll({}, null)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('filters the list by organization', async () => {
      const prisma = createPrisma();
      const service = new ResourcesService(prisma as never);

      await service.findAll({}, orgId);

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ site: { organizationId: orgId } }),
        }),
      );
    });

    it('refuses to create a resource on a site of another organization', async () => {
      const prisma = createPrisma();
      prisma.site.findFirst.mockResolvedValue(null);
      const service = new ResourcesService(prisma as never);

      await expect(
        service.create({ siteId: 'foreign-site' } as never, orgId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.site.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign-site', organizationId: orgId },
        }),
      );
      expect(prisma.resource.create).not.toHaveBeenCalled();
    });
  });

  describe('ResourceUsagesService', () => {
    const dto = {
      resourceId: 'resource-1',
      taskId: 'task-1',
      date: '2026-09-01',
      quantity: 10,
    };

    it('uses the authenticated user as creator', async () => {
      const prisma = createPrisma();
      prisma.resource.findFirst.mockResolvedValue({ siteId: 'site-1' });
      prisma.task.findFirst.mockResolvedValue({
        siteZone: { siteId: 'site-1' },
      });
      prisma.resourceUsage.create.mockResolvedValue({
        quantity: 10,
        resource: { quantity: 100, unitPrice: 2 },
      });
      const service = new ResourceUsagesService(prisma as never);

      await service.create(dto, 'user-1', orgId);

      expect(prisma.resourceUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: 'user-1' }),
        }),
      );
    });

    it('rejects a task from another site than the resource', async () => {
      const prisma = createPrisma();
      prisma.resource.findFirst.mockResolvedValue({ siteId: 'site-1' });
      prisma.task.findFirst.mockResolvedValue({
        siteZone: { siteId: 'site-2' },
      });
      const service = new ResourceUsagesService(prisma as never);

      await expect(service.create(dto, 'user-1', orgId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.resourceUsage.create).not.toHaveBeenCalled();
    });

    it('returns 404 for a usage of another organization', async () => {
      const prisma = createPrisma();
      prisma.resourceUsage.findFirst.mockResolvedValue(null);
      const service = new ResourceUsagesService(prisma as never);

      await expect(service.findOne('usage-1', orgId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.resourceUsage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'usage-1',
            resource: { site: { organizationId: orgId } },
          },
        }),
      );
    });
  });

  describe('DeliveriesService', () => {
    it('does not delete a delivery of another organization', async () => {
      const prisma = createPrisma();
      prisma.delivery.findFirst.mockResolvedValue(null);
      const service = new DeliveriesService(prisma as never);

      await expect(service.remove('delivery-1', orgId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.delivery.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'delivery-1', site: { organizationId: orgId } },
        }),
      );
      expect(prisma.delivery.delete).not.toHaveBeenCalled();
    });
  });
});
