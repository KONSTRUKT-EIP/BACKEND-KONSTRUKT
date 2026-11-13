import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SiteAccessService } from '../../src/shared/authorization/site-access.service';
import { SiteAction } from '../../src/shared/authorization/site-policies';

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

  it.each([UserRole.OWNER, UserRole.ADMIN_ORGANIZATION])(
    'gives %s access to any site in the organization',
    async (role) => {
      await expect(
        service.assertAccess(
          'site-1',
          { userId: 'admin-1', organizationId: 'org-1', role },
          SiteAction.DELETE_SITE,
        ),
      ).resolves.toBe(role);

      expect(prisma.siteMembership.findFirst).not.toHaveBeenCalled();
    },
  );

  it('returns the membership role as the effective site role', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue({
      role: UserRole.CHEF_PROJET,
    });

    await expect(
      service.assertAccess('site-1', {
        userId: 'user-1',
        organizationId: 'org-1',
        role: UserRole.COLLABORATEUR,
      }),
    ).resolves.toBe(UserRole.CHEF_PROJET);

    expect(prisma.siteMembership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', siteId: 'site-1', isActive: true },
      select: { role: true },
    });
  });

  it('uses the site role rather than the global role to evaluate actions', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue({
      role: UserRole.CHEF_PROJET,
    });

    await expect(
      service.assertAccess(
        'site-1',
        {
          userId: 'user-1',
          organizationId: 'org-1',
          role: UserRole.COLLABORATEUR,
        },
        SiteAction.MANAGE_MEMBERS,
      ),
    ).resolves.toBe(UserRole.CHEF_PROJET);
  });

  it('rejects an action the site role does not allow', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue({
      role: UserRole.COLLABORATEUR,
    });

    await expect(
      service.assertAccess(
        'site-1',
        {
          userId: 'user-1',
          organizationId: 'org-1',
          role: UserRole.CHEF_PROJET,
        },
        SiteAction.MANAGE_MEMBERS,
      ),
    ).rejects.toThrow(ForbiddenException);
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
        role: UserRole.OWNER,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.siteMembership.findFirst).not.toHaveBeenCalled();
  });
});
