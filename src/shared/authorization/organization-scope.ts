import { ForbiddenException } from '@nestjs/common';

export function requireOrganizationId(
  organizationId: string | null | undefined,
): string {
  if (!organizationId) {
    throw new ForbiddenException('Organization context is required');
  }
  return organizationId;
}
