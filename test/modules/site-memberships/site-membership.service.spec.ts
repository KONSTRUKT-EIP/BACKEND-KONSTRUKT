import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SiteMembershipService } from '../../../src/modules/site-memberships/site-membership.service';

describe('SiteMembershipService', () => {
  const prisma = {
    site: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    siteMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new SiteMembershipService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects listing without an organization context', async () => {
    await expect(service.findAll('site-1', null)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lists memberships only for a site in the organization', async () => {
    const memberships = [{ id: 'membership-1' }];
    prisma.site.findFirst.mockResolvedValue({ id: 'site-1' });
    prisma.siteMembership.findMany.mockResolvedValue(memberships);

    await expect(service.findAll('site-1', 'org-1')).resolves.toEqual(
      memberships,
    );
    expect(prisma.siteMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'site-1' } }),
    );
  });

  it('rejects a user from another organization', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site-1' });
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        'site-1',
        { userId: 'user-1', role: UserRole.COLLABORATEUR },
        'org-1',
        UserRole.OWNER,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.siteMembership.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate assignments', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site-1' });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.siteMembership.findFirst.mockResolvedValue({ id: 'membership-1' });

    await expect(
      service.create(
        'site-1',
        { userId: 'user-1', role: UserRole.COLLABORATEUR },
        'org-1',
        UserRole.OWNER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates and deletes an assignment inside the organization', async () => {
    const membership = { id: 'membership-1', role: UserRole.COLLABORATEUR };
    prisma.siteMembership.findFirst.mockResolvedValue(membership);
    prisma.siteMembership.update.mockResolvedValue({
      ...membership,
      isActive: false,
    });

    await expect(
      service.update(
        'site-1',
        'membership-1',
        { isActive: false },
        'org-1',
        UserRole.CHEF_PROJET,
      ),
    ).resolves.toMatchObject({ isActive: false });
    expect(prisma.siteMembership.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'membership-1' } }),
    );

    await expect(
      service.remove('site-1', 'membership-1', 'org-1', UserRole.CHEF_PROJET),
    ).resolves.toEqual({ message: 'Affectation supprimée' });
    expect(prisma.siteMembership.delete).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
    });
  });

  it('does not update or delete an assignment from another site', async () => {
    prisma.siteMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.update('site-2', 'membership-1', {}, 'org-1', UserRole.OWNER),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.remove('site-2', 'membership-1', 'org-1', UserRole.OWNER),
    ).rejects.toThrow(NotFoundException);
  });

  describe('role hierarchy', () => {
    beforeEach(() => {
      prisma.site.findFirst.mockResolvedValue({ id: 'site-1' });
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prisma.siteMembership.findFirst.mockResolvedValue(null);
    });

    it('lets a chef de projet assign a lower site role', async () => {
      prisma.siteMembership.create.mockResolvedValue({ id: 'membership-1' });

      await expect(
        service.create(
          'site-1',
          { userId: 'user-1', role: UserRole.CONDUCTEUR_TRAVAUX },
          'org-1',
          UserRole.CHEF_PROJET,
        ),
      ).resolves.toEqual({ id: 'membership-1' });
    });

    it('prevents a chef de projet from assigning their own role', async () => {
      await expect(
        service.create(
          'site-1',
          { userId: 'user-1', role: UserRole.CHEF_PROJET },
          'org-1',
          UserRole.CHEF_PROJET,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.siteMembership.create).not.toHaveBeenCalled();
    });

    it('prevents a chef de projet from editing or removing a peer', async () => {
      prisma.siteMembership.findFirst.mockResolvedValue({
        id: 'membership-2',
        role: UserRole.CHEF_PROJET,
      });

      await expect(
        service.update(
          'site-1',
          'membership-2',
          { isActive: false },
          'org-1',
          UserRole.CHEF_PROJET,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove('site-1', 'membership-2', 'org-1', UserRole.CHEF_PROJET),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.siteMembership.update).not.toHaveBeenCalled();
      expect(prisma.siteMembership.delete).not.toHaveBeenCalled();
    });

    it('prevents promoting a member above the actor role', async () => {
      prisma.siteMembership.findFirst.mockResolvedValue({
        id: 'membership-1',
        role: UserRole.COLLABORATEUR,
      });

      await expect(
        service.update(
          'site-1',
          'membership-1',
          { role: UserRole.CHEF_PROJET },
          'org-1',
          UserRole.CHEF_PROJET,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
