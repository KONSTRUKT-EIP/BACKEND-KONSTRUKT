import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import {
  SITE_ACCESS_KEY,
  SITE_PERMISSION_KEY,
} from '../../src/shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../src/shared/authorization/site-access.guard';
import { SiteAction } from '../../src/shared/authorization/site-policies';

describe('SiteAccessGuard', () => {
  const siteAccess = { assertAccess: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new SiteAccessGuard(
    reflector as unknown as Reflector,
    siteAccess as never,
  );

  function contextFor(request: Record<string, unknown>) {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function withMetadata(access: unknown, action?: SiteAction) {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SITE_ACCESS_KEY
        ? access
        : key === SITE_PERMISSION_KEY
          ? action
          : undefined,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('passes routes without site metadata', async () => {
    withMetadata(undefined);
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    expect(siteAccess.assertAccess).not.toHaveBeenCalled();
  });

  it('checks the action on the site and stores the effective role', async () => {
    withMetadata(
      { source: 'param', name: 'siteId' },
      SiteAction.MANAGE_MEMBERS,
    );
    siteAccess.assertAccess.mockResolvedValue(UserRole.CHEF_PROJET);
    const user = { userId: 'user-1', role: UserRole.COLLABORATEUR };
    const request: Record<string, unknown> = {
      user,
      params: { siteId: 'site-1' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(siteAccess.assertAccess).toHaveBeenCalledWith(
      'site-1',
      user,
      SiteAction.MANAGE_MEMBERS,
    );
    expect(request.siteRole).toBe(UserRole.CHEF_PROJET);
  });

  it('requires the site id unless optional', async () => {
    withMetadata({ source: 'query', name: 'siteId' }, SiteAction.VIEW_TEAMS);
    await expect(
      guard.canActivate(contextFor({ user: {}, query: {} })),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to the global role when an optional site id is absent', async () => {
    withMetadata(
      { source: 'query', name: 'siteId', optional: true },
      SiteAction.VIEW_DASHBOARD,
    );

    await expect(
      guard.canActivate(
        contextFor({ user: { role: UserRole.CONDUCTEUR_TRAVAUX }, query: {} }),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        contextFor({ user: { role: UserRole.CLIENT }, query: {} }),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(siteAccess.assertAccess).not.toHaveBeenCalled();
  });
});
