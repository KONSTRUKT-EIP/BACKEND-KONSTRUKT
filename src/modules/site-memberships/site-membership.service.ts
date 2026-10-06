import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateSiteMembershipDto } from './dto/create-site-membership.dto';
import { UpdateSiteMembershipDto } from './dto/update-site-membership.dto';

@Injectable()
export class SiteMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string, organizationId?: string | null) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId,
      },
    });

    if (!site) {
      throw new NotFoundException('Site introuvable');
    }

    return this.prisma.siteMembership.findMany({
      where: {
        siteId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    siteId: string,
    dto: CreateSiteMembershipDto,
    organizationId?: string | null,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId,
      },
    });

    if (!site) {
      throw new NotFoundException('Site introuvable');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const existingMembership = await this.prisma.siteMembership.findFirst({
      where: {
        siteId,
        userId: dto.userId,
      },
    });

    if (existingMembership) {
      throw new BadRequestException(
        'Cet utilisateur est déjà affecté à ce chantier',
      );
    }

    return this.prisma.siteMembership.create({
      data: {
        siteId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(
    siteId: string,
    membershipId: string,
    dto: UpdateSiteMembershipDto,
    organizationId?: string | null,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const membership = await this.prisma.siteMembership.findFirst({
      where: {
        id: membershipId,
        siteId,
        site: {
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Affectation introuvable');
    }

    return this.prisma.siteMembership.update({
      where: {
        id: membershipId,
      },
      data: {
        role: dto.role,
        isActive: dto.isActive,
      },
      include: {
        user: true,
        site: true,
      },
    });
  }

  async remove(
    siteId: string,
    membershipId: string,
    organizationId?: string | null,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const membership = await this.prisma.siteMembership.findFirst({
      where: {
        id: membershipId,
        siteId,
        site: {
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Affectation introuvable');
    }

    await this.prisma.siteMembership.delete({
      where: {
        id: membershipId,
      },
    });

    return {
      message: 'Affectation supprimée',
    };
  }
}
