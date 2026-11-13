import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import type { userPayload } from '../../modules/auth/jwt.strategy';
import { isOrganizationAdmin } from './site-policies';

@Injectable()
export class SiteAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(siteId: string, user: userPayload) {
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

    if (isOrganizationAdmin(user.role)) {
      return site;
    }

    const membership = await this.prisma.siteMembership.findFirst({
      where: {
        userId: user.userId,
        siteId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this site');
    }

    return site;
  }
}
