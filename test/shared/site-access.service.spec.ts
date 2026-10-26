import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SiteAccessService } from '../../src/shared/authorization/site-access.service';

describe('SiteAccessService', () => {
  const site = { id: 'site-1' };
  const prisma = {
    site: { findFirst: jest.fn() },
    siteMembership: { findFirst: jest.fn() },
  };
  const service = new SiteAccessService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.site.findFirst.mockResolvedValue(site);
  });

  it('allows an organization admin to access any site in the organization', async () => {
    await expect(
      service.assertAccess('site-1', {
        userId: 'admin-1',
        organizationId: 'org-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(site);

    expect(prisma.siteMembership.findFirst).not.toHaveBeenCalled();
  });

  it('allows a user with an active membership', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue({ id: 'membership-1' });

    await expect(
      service.assertAccess('site-1', {
        userId: 'user-1',
        organizationId: 'org-1',
        role: UserRole.COLLABORATEUR,
      }),
    ).resolves.toEqual(site);

    expect(prisma.siteMembership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', siteId: 'site-1', isActive: true },
      select: { id: true },
    });
  });

  it('rejects an inactive or missing membership', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.assertAccess('site-1', {
        userId: 'user-1',
        organizationId: 'org-1',
        role: UserRole.COLLABORATEUR,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not reveal a site from another organization', async () => {
    prisma.site.findFirst.mockResolvedValue(null);

    await expect(
      service.assertAccess('site-2', {
        userId: 'user-1',
        organizationId: 'org-1',
        role: UserRole.COLLABORATEUR,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.siteMembership.findFirst).not.toHaveBeenCalled();
  });
});
