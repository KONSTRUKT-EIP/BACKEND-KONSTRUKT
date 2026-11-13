import { UserRole } from '@prisma/client';

/**
 * Rôles d'organisation : accès implicite à tous les chantiers de l'organisation,
 * sans SiteMembership.
 */
export const ORGANIZATION_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN_ORGANIZATION,
];

export function isOrganizationAdmin(role?: UserRole | null): boolean {
  return !!role && ORGANIZATION_ADMIN_ROLES.includes(role);
}
