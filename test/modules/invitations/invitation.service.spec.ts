import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InvitationService } from '../../../src/modules/invitations/invitation.service';

const organizationId = 'organization-1';
const siteId = 'site-1';
const adminId = 'admin-1';

function createService() {
  const prisma = {
    site: { findFirst: jest.fn() },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const authService = { authenticateUser: jest.fn() };
  const mailer = { sendInvitation: jest.fn().mockResolvedValue(undefined) };
  const service = new InvitationService(
    prisma as never,
    authService as never,
    mailer as never,
  );
  return { service, prisma, authService, mailer };
}

describe('InvitationService', () => {
  it('rejects invitation creation outside an organization context', async () => {
    const { service } = createService();

    await expect(
      service.create(
        siteId,
        { email: 'person@example.com', role: UserRole.COLLABORATEUR },
        adminId,
        null,
        UserRole.ADMIN,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('stores only a hash and returns the activation link', async () => {
    const { service, prisma, mailer } = createService();
    prisma.site.findFirst.mockResolvedValue({ id: siteId, organizationId });
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
      UserRole.ADMIN,
    );

    const createData = prisma.invitation.create.mock.calls[0][0].data;
    expect(createData.email).toBe('person@example.com');
    expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.link).toMatch(/^https:\/\/app\.konstrukt\.io\/invite\/[a-f0-9]{64}$/);
    expect(result.link).not.toContain(createData.tokenHash);
    expect(mailer.sendInvitation).toHaveBeenCalledWith(
      'person@example.com',
      result.link,
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
});
