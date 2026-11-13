import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import type { userPayload } from '../../modules/auth/jwt.strategy';
import { can, isOrganizationAdmin, SiteAction } from './site-policies';

@Injectable()
export class SiteAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(
    siteId: string,
    user: userPayload,
    action?: SiteAction,
  ): Promise<UserRole> {
    const role = await this.resolveSiteRole(siteId, user);

    if (action && !can(role, action)) {
      throw new ForbiddenException(
        `Your role on this site does not allow ${action}`,
      );
    }

    return role;
  }

  private async resolveSiteRole(
    siteId: string,
    user: userPayload,
  ): Promise<UserRole> {
    if (!user.organizationId) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    if (user.role && isOrganizationAdmin(user.role)) {
      return user.role;
    }

    const membership = await this.prisma.siteMembership.findFirst({
      where: {
        userId: user.userId,
        siteId,
        isActive: true,
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this site');
    }

    return membership.role;
  }
}
