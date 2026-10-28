import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateSiteZoneDto } from './dto/create-site-zone.dto';
import { UpdateSiteZoneDto } from './dto/update-site-zone.dto';

// L'appartenance du chantier a l'organisation et l'acces de l'utilisateur
// sont verifies en amont par SiteAccessGuard.
@Injectable()
export class SiteZoneService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(siteId: string) {
    return this.prisma.siteZone.findMany({
      where: { siteId },
      include: { _count: { select: { tasks: true } } },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(siteId: string, zoneId: string) {
    const zone = await this.prisma.siteZone.findFirst({
      where: { id: zoneId, siteId },
      include: { _count: { select: { tasks: true } } },
    });

    if (!zone) {
      throw new NotFoundException(`Zone de chantier ${zoneId} introuvable`);
    }

    return zone;
  }

  async create(siteId: string, dto: CreateSiteZoneDto) {
    await this.ensureNameAvailable(siteId, dto.name);

    return this.prisma.siteZone.create({
      data: {
        siteId,
        name: dto.name,
        level: dto.level,
        description: dto.description ?? '',
      },
    });
  }

  async update(siteId: string, zoneId: string, dto: UpdateSiteZoneDto) {
    await this.findOne(siteId, zoneId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(siteId, dto.name, zoneId);
    }

    return this.prisma.siteZone.update({
      where: { id: zoneId },
      data: {
        name: dto.name,
        level: dto.level,
        description: dto.description,
      },
    });
  }

  async remove(siteId: string, zoneId: string) {
    const zone = await this.findOne(siteId, zoneId);

    if (zone._count.tasks > 0) {
      throw new ConflictException(
        `Zone de chantier ${zoneId} liee a ${zone._count.tasks} tache(s)`,
      );
    }

    await this.prisma.siteZone.delete({ where: { id: zoneId } });
    return { message: `Zone de chantier ${zoneId} supprimee` };
  }

  private async ensureNameAvailable(
    siteId: string,
    name: string,
    excludeZoneId?: string,
  ) {
    const existing = await this.prisma.siteZone.findFirst({
      where: {
        siteId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeZoneId ? { id: { not: excludeZoneId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Une zone nommee "${name}" existe deja sur ce chantier`,
      );
    }
  }
}
