import { ConflictException, NotFoundException } from '@nestjs/common';
import { SiteZoneService } from '../../../src/modules/site-zones/site-zone.service';

describe('SiteZoneService', () => {
  const prisma = {
    siteZone: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new SiteZoneService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists zones scoped to the site', async () => {
    const zones = [{ id: 'zone-1' }];
    prisma.siteZone.findMany.mockResolvedValue(zones);

    await expect(service.findAll('site-1')).resolves.toEqual(zones);
    expect(prisma.siteZone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'site-1' } }),
    );
  });

  it('returns 404 for a zone belonging to another site', async () => {
    prisma.siteZone.findFirst.mockResolvedValue(null);

    await expect(service.findOne('site-1', 'zone-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.siteZone.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'zone-1', siteId: 'site-1' } }),
    );
  });

  it('creates a zone with an empty description by default', async () => {
    prisma.siteZone.findFirst.mockResolvedValue(null);
    prisma.siteZone.create.mockResolvedValue({ id: 'zone-1' });

    await service.create('site-1', { name: 'Batiment A', level: 'R+1' });

    expect(prisma.siteZone.create).toHaveBeenCalledWith({
      data: {
        siteId: 'site-1',
        name: 'Batiment A',
        level: 'R+1',
        description: '',
      },
    });
  });

  it('rejects a duplicate zone name on the same site', async () => {
    prisma.siteZone.findFirst.mockResolvedValue({ id: 'zone-2' });

    await expect(
      service.create('site-1', { name: 'batiment a', level: 'R+1' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.siteZone.create).not.toHaveBeenCalled();
  });

  it('ignores the zone itself when checking name on update', async () => {
    prisma.siteZone.findFirst
      .mockResolvedValueOnce({ id: 'zone-1', _count: { tasks: 0 } })
      .mockResolvedValueOnce(null);
    prisma.siteZone.update.mockResolvedValue({ id: 'zone-1' });

    await service.update('site-1', 'zone-1', { name: 'Batiment B' });

    expect(prisma.siteZone.findFirst).toHaveBeenLastCalledWith({
      where: {
        siteId: 'site-1',
        name: { equals: 'Batiment B', mode: 'insensitive' },
        id: { not: 'zone-1' },
      },
      select: { id: true },
    });
    expect(prisma.siteZone.update).toHaveBeenCalledWith({
      where: { id: 'zone-1' },
      data: { name: 'Batiment B', level: undefined, description: undefined },
    });
  });

  it('refuses to delete a zone still linked to tasks', async () => {
    prisma.siteZone.findFirst.mockResolvedValue({
      id: 'zone-1',
      _count: { tasks: 3 },
    });

    await expect(service.remove('site-1', 'zone-1')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.siteZone.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused zone', async () => {
    prisma.siteZone.findFirst.mockResolvedValue({
      id: 'zone-1',
      _count: { tasks: 0 },
    });

    await service.remove('site-1', 'zone-1');

    expect(prisma.siteZone.delete).toHaveBeenCalledWith({
      where: { id: 'zone-1' },
    });
  });
});
