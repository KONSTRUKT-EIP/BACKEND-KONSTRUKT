import { UserRole } from '@prisma/client';

export const ORGANIZATION_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN_ORGANIZATION,
];

/** Rôles attribuables sur un chantier (SiteMembership / Invitation). */
export const SITE_ROLES: readonly UserRole[] = [
  UserRole.CHEF_PROJET,
  UserRole.CONDUCTEUR_TRAVAUX,
  UserRole.COLLABORATEUR,
  UserRole.CLIENT,
];

export enum SiteAction {
  VIEW_SITE = 'site.view',
  UPDATE_SITE = 'site.update',
  DELETE_SITE = 'site.delete',
  VIEW_MEMBERS = 'members.view',
  MANAGE_MEMBERS = 'members.manage',
  MANAGE_INVITATIONS = 'invitations.manage',
  VIEW_TEAMS = 'teams.view',
  MANAGE_WORKFORCE = 'workforce.manage',
  VIEW_DASHBOARD = 'dashboard.view',
  EDIT_DASHBOARD = 'dashboard.edit',
}

const ALL_ACTIONS = Object.values(SiteAction);

/** Matrice des droits par rôle effectif sur un chantier. */
export const SITE_PERMISSIONS: Record<UserRole, readonly SiteAction[]> = {
  [UserRole.OWNER]: ALL_ACTIONS,
  [UserRole.ADMIN_ORGANIZATION]: ALL_ACTIONS,
  [UserRole.CHEF_PROJET]: ALL_ACTIONS.filter(
    (action) => action !== SiteAction.DELETE_SITE,
  ),
  [UserRole.CONDUCTEUR_TRAVAUX]: [
    SiteAction.VIEW_SITE,
    SiteAction.VIEW_MEMBERS,
    SiteAction.VIEW_TEAMS,
    SiteAction.MANAGE_WORKFORCE,
    SiteAction.VIEW_DASHBOARD,
    SiteAction.EDIT_DASHBOARD,
  ],
  [UserRole.COLLABORATEUR]: [SiteAction.VIEW_SITE, SiteAction.VIEW_TEAMS],
  [UserRole.CLIENT]: [SiteAction.VIEW_SITE],
};

export function isOrganizationAdmin(role?: UserRole | null): boolean {
  return !!role && ORGANIZATION_ADMIN_ROLES.includes(role);
}

export function can(role: UserRole | null | undefined, action: SiteAction) {
  return !!role && SITE_PERMISSIONS[role].includes(action);
}

export function getSitePermissions(role: UserRole): SiteAction[] {
  return [...SITE_PERMISSIONS[role]];
}
