import { UserRole } from '@prisma/client';
import {
  can,
  isOrganizationAdmin,
  SITE_PERMISSIONS,
  SITE_ROLES,
  SiteAction,
} from '../../src/shared/authorization/site-policies';

describe('site policies', () => {
  it('defines permissions for every role', () => {
    for (const role of Object.values(UserRole)) {
      expect(SITE_PERMISSIONS[role]).toContain(SiteAction.VIEW_SITE);
    }
  });

  it('treats only OWNER and ADMIN_ORGANIZATION as organization admins', () => {
    expect(isOrganizationAdmin(UserRole.OWNER)).toBe(true);
    expect(isOrganizationAdmin(UserRole.ADMIN_ORGANIZATION)).toBe(true);
    for (const role of SITE_ROLES) {
      expect(isOrganizationAdmin(role)).toBe(false);
    }
  });

  it.each([
    [UserRole.CHEF_PROJET, SiteAction.MANAGE_MEMBERS, true],
    [UserRole.CHEF_PROJET, SiteAction.DELETE_SITE, false],
    [UserRole.CONDUCTEUR_TRAVAUX, SiteAction.MANAGE_WORKFORCE, true],
    [UserRole.CONDUCTEUR_TRAVAUX, SiteAction.MANAGE_INVITATIONS, false],
    [UserRole.COLLABORATEUR, SiteAction.VIEW_TEAMS, true],
    [UserRole.COLLABORATEUR, SiteAction.VIEW_DASHBOARD, false],
    [UserRole.CLIENT, SiteAction.VIEW_SITE, true],
    [UserRole.CLIENT, SiteAction.VIEW_TEAMS, false],
  ])('%s can %s: %s', (role, action, expected) => {
    expect(can(role, action)).toBe(expected);
  });

  it('denies every action without a role', () => {
    expect(can(undefined, SiteAction.VIEW_SITE)).toBe(false);
  });
});
