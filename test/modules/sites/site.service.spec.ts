import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SiteService } from '../../../src/modules/sites/site.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('SiteService photos', () => {
  let service: SiteService;
  let siteFindFirst: jest.Mock;
  let photoUpsert: jest.Mock;
  let photoFindUnique: jest.Mock;
  let photoFindImage: jest.Mock;

  const jpeg = (size = 1024) => ({
    buffer: Buffer.alloc(size),
    mimetype: 'image/jpeg',
    size,
  });

  beforeEach(() => {
    siteFindFirst = jest.fn().mockResolvedValue({ id: 'site-1' });
    photoUpsert = jest.fn().mockResolvedValue({ updatedAt: new Date(0) });
    photoFindUnique = jest.fn();
    photoFindImage = jest.fn();

    service = new SiteService({
      site: { findFirst: siteFindFirst },
      sitePhoto: {
        upsert: photoUpsert,
        findFirst: photoFindUnique,
        findUnique: photoFindImage,
      },
    } as unknown as PrismaService);
  });

  it('stores a valid image for the site', async () => {
    const result = await service.setPhoto('site-1', jpeg(), 'org-a');

    expect(photoUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'site-1' } }),
    );
    expect(result.updatedAt).toEqual(new Date(0));
  });

  it('rejects a missing file', async () => {
    await expect(
      service.setPhoto('site-1', undefined, 'org-a'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-image file', async () => {
    await expect(
      service.setPhoto(
        'site-1',
        { ...jpeg(), mimetype: 'application/pdf' },
        'org-a',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(photoUpsert).not.toHaveBeenCalled();
  });

  it('rejects an image larger than 5 MB', async () => {
    await expect(
      service.setPhoto('site-1', jpeg(6 * 1024 * 1024), 'org-a'),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a site from another organization', async () => {
    siteFindFirst.mockResolvedValue(null);

    await expect(service.setPhoto('site-1', jpeg(), 'org-b')).rejects.toThrow(
      NotFoundException,
    );
    expect(photoUpsert).not.toHaveBeenCalled();
  });

  it('returns 404 when the site has no photo', async () => {
    photoFindUnique.mockResolvedValue(null);

    await expect(service.getPhoto('site-1', 'org-a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('serves a photo from memory while it has not changed', async () => {
    const updatedAt = new Date('2026-11-01T10:00:00.000Z');
    photoFindUnique.mockResolvedValue({ updatedAt });
    photoFindImage.mockResolvedValue({
      updatedAt,
      mimeType: 'image/jpeg',
      size: 3,
      data: new Uint8Array([1, 2, 3]),
    });

    await service.getPhoto('site-1', 'org-a');
    const second = await service.getPhoto('site-1', 'org-a');

    expect(photoFindImage).toHaveBeenCalledTimes(1);
    expect(second.data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('downloads the photo again once it has been replaced', async () => {
    photoFindUnique.mockResolvedValueOnce({ updatedAt: new Date(1) });
    photoFindImage.mockResolvedValueOnce({
      updatedAt: new Date(1),
      mimeType: 'image/jpeg',
      size: 1,
      data: new Uint8Array([1]),
    });
    await service.getPhoto('site-1', 'org-a');

    photoFindUnique.mockResolvedValueOnce({ updatedAt: new Date(2) });
    photoFindImage.mockResolvedValueOnce({
      updatedAt: new Date(2),
      mimeType: 'image/jpeg',
      size: 1,
      data: new Uint8Array([2]),
    });
    const result = await service.getPhoto('site-1', 'org-a');

    expect(photoFindImage).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual(new Uint8Array([2]));
  });
});

describe('SiteService work progress', () => {
  let service: SiteService;
  let siteFindMany: jest.Mock;

  const task = (status: string, progressPercent?: number) => ({
    status,
    progress: progressPercent === undefined ? [] : [{ progressPercent }],
  });

  beforeEach(() => {
    siteFindMany = jest.fn();
    service = new SiteService({
      site: { findMany: siteFindMany },
    } as unknown as PrismaService);
  });

  it('averages the latest progress of each task', async () => {
    siteFindMany.mockResolvedValue([
      {
        id: 'site-1',
        zones: [
          { tasks: [task('EN_COURS', 40), task('TERMINEE', 70)] },
          { tasks: [task('EN_ATTENTE'), task('ANNULEE', 90)] },
        ],
      },
    ]);

    const [site] = await service.findAll('org-a');

    // (40 + 100 + 0) / 3, la tâche annulée est ignorée
    expect(site.progressPct).toBe(47);
    expect(site).not.toHaveProperty('zones');
  });

  it('returns null when the site has no task', async () => {
    siteFindMany.mockResolvedValue([{ id: 'site-1', zones: [] }]);

    const [site] = await service.findAll('org-a');

    expect(site.progressPct).toBeNull();
  });
});

describe('SiteService archivage', () => {
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
