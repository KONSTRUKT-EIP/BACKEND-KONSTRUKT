import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateSiteDto, SiteStatus } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId?: string) {
    return this.prisma.site.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { resources: true, deliveries: true } },
      },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        resources: { orderBy: { name: 'asc' } },
        _count: { select: { deliveries: true, documents: true } },
      },
    });
    if (!site) throw new NotFoundException(`Site ${id} introuvable`);
    return site;
  }

  async create(dto: CreateSiteDto) {
    return this.prisma.site.create({
      data: {
        organizationId: dto.organizationId,
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

  async update(id: string, dto: UpdateSiteDto) {
    await this.findOne(id);
    return this.prisma.site.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status as SiteStatus,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.site.delete({ where: { id } });
    return { message: 'Site supprimé' };
  }
}
