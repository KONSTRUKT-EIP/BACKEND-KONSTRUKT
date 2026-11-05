import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateSiteDto, SiteStatus } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

export const SITE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
const SITE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Nombre de photos gardées en mémoire (≈ 300 Ko max chacune après compression côté front)
const PHOTO_CACHE_SIZE = 50;

interface CachedPhoto {
  updatedAt: Date;
  mimeType: string;
  size: number;
  data: Uint8Array;
}

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class SiteService {
  // Le transfert d'une image depuis la base est lent : on garde les dernières photos servies
  private readonly photoCache = new Map<string, CachedPhoto>();

  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    organizationId?: string | null,
    userId?: string,
  ) {
    if (organizationId) {
      return organizationId;
    }

    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    return user?.organizationId ?? null;
  }

  async findAll(
    organizationId?: string | null,
    userId?: string,
    includeArchived = false,
  ) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) return [];
    const sites = await this.prisma.site.findMany({
      where: {
        organizationId: resolvedOrganizationId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { resources: true, deliveries: true } },
        photo: { select: { updatedAt: true } },
        zones: {
          select: {
            tasks: {
              select: {
                status: true,
                progress: {
                  select: { progressPercent: true },
                  orderBy: { date: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return sites.map(({ zones, ...site }) => ({
      ...site,
      progressPct: this.computeWorkProgress(
        zones.flatMap((zone) => zone.tasks),
      ),
    }));
  }

  // Avancement des travaux : moyenne du dernier avancement déclaré de chaque tâche.
  // Une tâche terminée compte pour 100 %, une tâche annulée est ignorée.
  private computeWorkProgress(
    tasks: { status: TaskStatus; progress: { progressPercent: number }[] }[],
  ): number | null {
    const counted = tasks.filter((task) => task.status !== TaskStatus.ANNULEE);
    if (counted.length === 0) return null;
    const total = counted.reduce(
      (sum, task) =>
        sum +
        (task.status === TaskStatus.TERMINEE
          ? 100
          : (task.progress[0]?.progressPercent ?? 0)),
      0,
    );
    return Math.round(total / counted.length);
  }

  async findOne(id: string, organizationId?: string | null, userId?: string) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) {
      throw new NotFoundException(`Site ${id} introuvable`);
    }
    const site = await this.prisma.site.findFirst({
      where: { id, organizationId: resolvedOrganizationId },
      include: {
        organization: { select: { id: true, name: true } },
        resources: { orderBy: { name: 'asc' } },
        _count: { select: { deliveries: true, documents: true } },
        photo: { select: { updatedAt: true } },
      },
    });
    if (!site) throw new NotFoundException(`Site ${id} introuvable`);
    return site;
  }

  // Vérification d'accès légère : une seule requête, sans charger les relations du chantier
  private async assertSiteInOrganization(
    id: string,
    organizationId?: string | null,
  ) {
    const site = organizationId
      ? await this.prisma.site.findFirst({
          where: { id, organizationId },
          select: { id: true },
        })
      : null;
    if (!site) throw new NotFoundException(`Site ${id} introuvable`);
  }

  async create(
    dto: CreateSiteDto,
    organizationId?: string | null,
    userId?: string,
  ) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return this.prisma.site.create({
      data: {
        organizationId: resolvedOrganizationId,
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

  async update(
    id: string,
    dto: UpdateSiteDto,
    organizationId?: string | null,
    userId?: string,
  ) {
    await this.findOne(id, organizationId, userId);
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

  async archive(id: string, organizationId?: string | null, userId?: string) {
    await this.findOne(id, organizationId, userId);
    return this.prisma.site.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async unarchive(id: string, organizationId?: string | null, userId?: string) {
    await this.findOne(id, organizationId, userId);
    return this.prisma.site.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async remove(id: string, organizationId?: string | null, userId?: string) {
    await this.findOne(id, organizationId, userId);
    try {
      await this.prisma.site.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Ce chantier contient des données : archivez-le au lieu de le supprimer',
        );
      }
      throw error;
    }
    return { message: 'Site supprimé' };
  }

  async getPhoto(id: string, organizationId?: string | null) {
    // On ne lit d'abord que la date de mise à jour (rapide), avec le contrôle d'organisation
    const meta = organizationId
      ? await this.prisma.sitePhoto.findFirst({
          where: { siteId: id, site: { organizationId } },
          select: { updatedAt: true },
        })
      : null;
    if (!meta) throw new NotFoundException(`Aucune photo pour le site ${id}`);

    const cached = this.photoCache.get(id);
    if (cached && cached.updatedAt.getTime() === meta.updatedAt.getTime()) {
      return cached;
    }

    // Photo absente du cache ou modifiée : on récupère l'image elle-même
    const photo = await this.prisma.sitePhoto.findUnique({
      where: { siteId: id },
      select: { updatedAt: true, mimeType: true, size: true, data: true },
    });
    if (!photo) throw new NotFoundException(`Aucune photo pour le site ${id}`);

    this.photoCache.delete(id);
    this.photoCache.set(id, photo);
    if (this.photoCache.size > PHOTO_CACHE_SIZE) {
      // La Map garde l'ordre d'insertion : la première entrée est la plus ancienne
      const [oldest] = this.photoCache.keys();
      this.photoCache.delete(oldest);
    }
    return photo;
  }

  async setPhoto(
    id: string,
    file: UploadedPhoto | undefined,
    organizationId?: string | null,
  ) {
    await this.assertSiteInOrganization(id, organizationId);
    if (!file) throw new BadRequestException('Aucune image reçue');
    if (!SITE_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format non supporté (JPEG, PNG ou WebP uniquement)',
      );
    }
    if (file.size > SITE_PHOTO_MAX_SIZE) {
      throw new BadRequestException('Image trop lourde (5 Mo maximum)');
    }

    const data = new Uint8Array(file.buffer);
    const photo = await this.prisma.sitePhoto.upsert({
      where: { siteId: id },
      update: { data, mimeType: file.mimetype, size: file.size },
      create: { siteId: id, data, mimeType: file.mimetype, size: file.size },
      select: { updatedAt: true },
    });
    return { updatedAt: photo.updatedAt };
  }

  async removePhoto(id: string, organizationId?: string | null) {
    await this.assertSiteInOrganization(id, organizationId);
    await this.prisma.sitePhoto.deleteMany({ where: { siteId: id } });
    this.photoCache.delete(id);
    return { message: 'Photo supprimée' };
  }
}
