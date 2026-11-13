import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InvitationService } from '../../../src/modules/invitations/invitation.service';
import { SiteAction } from '../../../src/shared/authorization/site-policies';

const organizationId = 'organization-1';
const siteId = 'site-1';
const adminId = 'admin-1';

function createService() {
  const prisma = {
    site: { findFirst: jest.fn(), findUnique: jest.fn() },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const authService = { authenticateUser: jest.fn() };
  const mailer = { sendInvitation: jest.fn().mockResolvedValue(undefined) };
  const siteAccess = { assertAccess: jest.fn() };
  const service = new InvitationService(
    prisma as never,
    authService as never,
    mailer as never,
    siteAccess as never,
  );
  return { service, prisma, authService, mailer, siteAccess };
}

describe('InvitationService', () => {
  it('lists organization invitations with their computed status', async () => {
    const { service, prisma } = createService();
    const now = Date.now();
    prisma.invitation.findMany.mockResolvedValue([
      {
        id: 'cancelled',
        email: 'cancelled@example.com',
        role: UserRole.COLLABORATEUR,
        expiresAt: new Date(now + 60_000),
        acceptedAt: null,
        canceledAt: new Date(now - 60_000),
        createdAt: new Date(now),
        sentAt: new Date(now),
        deliveryMethod: 'EMAIL',
        organization: { id: organizationId, name: 'Konstrukt' },
        site: { id: siteId, name: 'Site A', city: 'Paris' },
      },
      {
        id: 'accepted',
        email: 'accepted@example.com',
        role: UserRole.COLLABORATEUR,
        expiresAt: new Date(now + 60_000),
        acceptedAt: new Date(now - 60_000),
        canceledAt: null,
        createdAt: new Date(now - 1),
        sentAt: new Date(now - 60_000),
        deliveryMethod: 'EMAIL',
        organization: { id: organizationId, name: 'Konstrukt' },
        site: { id: siteId, name: 'Site A', city: 'Paris' },
      },
      {
        id: 'pending',
        email: 'pending@example.com',
        role: UserRole.COLLABORATEUR,
        expiresAt: new Date(now + 60_000),
        acceptedAt: null,
        canceledAt: null,
        createdAt: new Date(now - 2),
        sentAt: null,
        deliveryMethod: 'EMAIL',
        organization: { id: organizationId, name: 'Konstrukt' },
        site: { id: siteId, name: 'Site A', city: 'Paris' },
      },
      {
        id: 'expired',
        email: 'expired@example.com',
        role: UserRole.COLLABORATEUR,
        expiresAt: new Date(now - 60_000),
        acceptedAt: null,
        canceledAt: null,
        createdAt: new Date(now - 3),
        sentAt: new Date(now - 120_000),
        deliveryMethod: 'EMAIL',
        organization: { id: organizationId, name: 'Konstrukt' },
        site: { id: siteId, name: 'Site A', city: 'Paris' },
      },
    ]);

    const result = await service.findAll(organizationId, UserRole.OWNER);

    expect(prisma.invitation.findMany).toHaveBeenCalledWith({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    });
    expect(result.map((invitation) => invitation.status)).toEqual([
      'CANCELLED',
      'ACCEPTED',
      'PENDING',
      'EXPIRED',
    ]);
  });

  it('requires an organization context to list invitations', async () => {
    const { service } = createService();

    await expect(service.findAll(null, UserRole.OWNER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects invitation creation outside an organization context', async () => {
    const { service } = createService();

    await expect(
      service.create(
        siteId,
        { email: 'person@example.com', role: UserRole.COLLABORATEUR },
        adminId,
        null,
        UserRole.OWNER,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('stores only a hash and returns the activation link', async () => {
    const { service, prisma, mailer } = createService();
    prisma.site.findFirst.mockResolvedValue({ id: siteId, organizationId });
    prisma.site.findUnique.mockResolvedValue({
      name: 'Site A',
      organization: { name: 'Konstrukt' },
    });
    prisma.user.findUnique.mockResolvedValue({
      firstName: 'Marie',
      lastName: 'Dupont',
    });
    prisma.invitation.create.mockImplementation(async ({ data, select }) => ({
      id: 'invitation-1',
      ...data,
      organization: { id: organizationId, name: 'Konstrukt' },
      site: { id: siteId, name: 'Site A', city: 'Paris' },
      select,
    }));

    const result = await service.create(
      siteId,
      { email: 'Person@Example.com', role: UserRole.COLLABORATEUR },
      adminId,
      organizationId,
      UserRole.OWNER,
    );

    const createData = prisma.invitation.create.mock.calls[0][0].data;
    expect(createData.email).toBe('person@example.com');
    expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.link).toMatch(/^https?:\/\/[^/]+\/invite\/[a-f0-9]{64}$/);
    expect(result.link).not.toContain(createData.tokenHash);
    expect(mailer.sendInvitation).toHaveBeenCalledWith(
      'person@example.com',
      expect.objectContaining({
        inviterName: 'Marie Dupont',
        organizationName: 'Konstrukt',
        siteName: 'Site A',
        role: UserRole.COLLABORATEUR,
        invitationLink: result.link,
        expirationHours: 48,
      }),
    );
  });

  it('rejects an unknown invitation token', async () => {
    const { service, prisma } = createService();
    prisma.invitation.findUnique.mockResolvedValue(null);

    await expect(service.getByToken('invalid-token')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates a user and site membership atomically when accepting', async () => {
    const { service, prisma, authService } = createService();
    const user = {
      id: 'user-1',
      email: 'person@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.COLLABORATEUR,
      organizationId,
      createdAt: new Date(),
    };
    const tx = {
      invitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'invitation-1',
          email: user.email,
          organizationId,
          siteId,
          role: UserRole.COLLABORATEUR,
          acceptedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          site: { id: siteId },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(user),
      },
      siteMembership: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    authService.authenticateUser.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
    });

    const result = await service.accept('raw-token', {
      firstName: 'John',
      lastName: 'Doe',
      password: 'Password1!',
    });

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: user.email,
          organizationId,
          role: UserRole.COLLABORATEUR,
        }),
      }),
    );
    expect(tx.siteMembership.create).toHaveBeenCalledWith({
      data: { userId: user.id, siteId, role: UserRole.COLLABORATEUR },
    });
    expect(result).toMatchObject({ access_token: 'access', user });
  });

  it('rejects an already accepted invitation', async () => {
    const { service, prisma } = createService();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        invitation: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'invitation-1',
            acceptedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
          }),
        },
      }),
    );

    await expect(
      service.accept('raw-token', {
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password1!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an expired invitation', async () => {
    const { service, prisma } = createService();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        invitation: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'invitation-1',
            acceptedAt: null,
            expiresAt: new Date(Date.now() - 60_000),
          }),
        },
      }),
    );

    await expect(
      service.accept('expired-token', {
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password1!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects accepting an invitation for an existing email', async () => {
    const { service, prisma } = createService();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        invitation: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'invitation-1',
            email: 'person@example.com',
            acceptedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
        },
      }),
    );

    await expect(
      service.accept('used-email-token', {
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password1!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('keeps cancelled invitations and blocks resending them', async () => {
    const { service, prisma, siteAccess } = createService();
    const owner = { userId: adminId, organizationId, role: UserRole.OWNER };
    siteAccess.assertAccess.mockResolvedValue(UserRole.OWNER);
    prisma.invitation.findFirst.mockResolvedValue({
      id: 'invitation-1',
      acceptedAt: null,
      canceledAt: null,
      siteId,
      role: UserRole.COLLABORATEUR,
    });
    prisma.invitation.update.mockResolvedValue({});

    await service.remove('invitation-1', owner);

    expect(prisma.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invitation-1' },
        data: { canceledAt: expect.any(Date) },
      }),
    );

    prisma.invitation.findFirst.mockResolvedValue({
      id: 'invitation-1',
      acceptedAt: null,
      canceledAt: new Date(),
      siteId,
      role: UserRole.COLLABORATEUR,
    });
    await expect(service.resend('invitation-1', owner)).rejects.toThrow(
      'Invitation has been cancelled',
    );
  });

  describe('per-site role policies', () => {
    const chef = {
      userId: 'chef-1',
      organizationId,
      role: UserRole.COLLABORATEUR,
    };

    it('prevents a chef de projet from inviting a peer chef de projet', async () => {
      const { service, prisma } = createService();

      await expect(
        service.create(
          siteId,
          { email: 'peer@example.com', role: UserRole.CHEF_PROJET },
          'chef-1',
          organizationId,
          UserRole.CHEF_PROJET,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('checks the role on the invitation site before cancelling', async () => {
      const { service, prisma, siteAccess } = createService();
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        siteId,
        role: UserRole.COLLABORATEUR,
        acceptedAt: null,
      });
      siteAccess.assertAccess.mockResolvedValue(UserRole.CHEF_PROJET);

      await expect(service.remove('invitation-1', chef)).resolves.toEqual({
        message: 'Invitation cancelled',
      });
      expect(siteAccess.assertAccess).toHaveBeenCalledWith(
        siteId,
        chef,
        SiteAction.MANAGE_INVITATIONS,
      );
    });

    it('rejects cancelling an invitation for a role above the actor', async () => {
      const { service, prisma, siteAccess } = createService();
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        siteId,
        role: UserRole.CHEF_PROJET,
        acceptedAt: null,
      });
      siteAccess.assertAccess.mockResolvedValue(UserRole.CHEF_PROJET);

      await expect(service.remove('invitation-1', chef)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.invitation.delete).not.toHaveBeenCalled();
    });

    it('propagates a site access refusal on resend', async () => {
      const { service, prisma, siteAccess, mailer } = createService();
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        siteId,
        role: UserRole.COLLABORATEUR,
        acceptedAt: null,
      });
      siteAccess.assertAccess.mockRejectedValue(new ForbiddenException());

      await expect(service.resend('invitation-1', chef)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mailer.sendInvitation).not.toHaveBeenCalled();
    });
  });
});
