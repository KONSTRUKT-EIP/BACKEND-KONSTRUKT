import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateSiteDto, SiteStatus } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId?: string | null) {
    if (!organizationId) return [];
    return this.prisma.site.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { resources: true, deliveries: true } },
      },
    });
  }

  async findOne(id: string, organizationId?: string | null) {
    if (!organizationId) {
      throw new NotFoundException(`Site ${id} introuvable`);
    }
    const site = await this.prisma.site.findFirst({
      where: { id, organizationId },
      include: {
        organization: { select: { id: true, name: true } },
        resources: { orderBy: { name: 'asc' } },
        _count: { select: { deliveries: true, documents: true } },
      },
    });
    if (!site) throw new NotFoundException(`Site ${id} introuvable`);
    return site;
  }

  async create(dto: CreateSiteDto, organizationId?: string | null) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return this.prisma.site.create({
      data: {
        organizationId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status as SiteStatus,
        budget: dto.budget,
      },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateSiteDto, organizationId?: string | null) {
    await this.findOne(id, organizationId);
    const siteData = dto;
    return this.prisma.site.update({
      where: { id },
      data: {
        ...siteData,
        startDate: siteData.startDate
          ? new Date(siteData.startDate)
          : undefined,
        endDate: siteData.endDate ? new Date(siteData.endDate) : undefined,
        status: siteData.status as SiteStatus,
      },
    });
  }

  async remove(id: string, organizationId?: string | null) {
    await this.findOne(id, organizationId);
    await this.prisma.site.delete({ where: { id } });
    return { message: 'Site supprimé' };
  }
}
