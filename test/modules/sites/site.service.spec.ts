import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SiteService } from '../../../src/modules/sites/site.service';

describe('SiteService', () => {
  const prisma = {
    site: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const service = new SiteService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.site.findFirst.mockResolvedValue({ id: 'site-1' });
  });

  it('hides archived sites by default', async () => {
    prisma.site.findMany.mockResolvedValue([]);

    await service.findAll('org-1');

    expect(prisma.site.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1', archivedAt: null },
      }),
    );
  });

  it('lists archived sites when asked', async () => {
    prisma.site.findMany.mockResolvedValue([]);

    await service.findAll('org-1', undefined, true);

    expect(prisma.site.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('archives and unarchives a site of the organization', async () => {
    await service.archive('site-1', 'org-1');
    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { archivedAt: expect.any(Date) },
    });

    await service.unarchive('site-1', 'org-1');
    expect(prisma.site.update).toHaveBeenLastCalledWith({
      where: { id: 'site-1' },
      data: { archivedAt: null },
    });
  });

  it('does not archive a site of another organization', async () => {
    prisma.site.findFirst.mockResolvedValue(null);

    await expect(service.archive('site-1', 'org-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.site.update).not.toHaveBeenCalled();
  });

  it('returns 409 when deleting a site that still has data', async () => {
    prisma.site.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(service.remove('site-1', 'org-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
