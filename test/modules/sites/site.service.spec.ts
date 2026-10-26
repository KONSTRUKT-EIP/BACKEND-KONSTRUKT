import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SiteService } from '../../../src/modules/sites/site.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('SiteService photos', () => {
  let service: SiteService;
  let siteFindFirst: jest.Mock;
  let photoUpsert: jest.Mock;
  let photoFindUnique: jest.Mock;

  const jpeg = (size = 1024) => ({
    buffer: Buffer.alloc(size),
    mimetype: 'image/jpeg',
    size,
  });

  beforeEach(() => {
    siteFindFirst = jest.fn().mockResolvedValue({ id: 'site-1' });
    photoUpsert = jest.fn().mockResolvedValue({ updatedAt: new Date(0) });
    photoFindUnique = jest.fn();

    service = new SiteService({
      site: { findFirst: siteFindFirst },
      sitePhoto: { upsert: photoUpsert, findUnique: photoFindUnique },
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
});
