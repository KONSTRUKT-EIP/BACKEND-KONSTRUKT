import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { Site } from '@prisma/client';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getSiteById(siteId: string): Promise<Site | null> {
    return this.prisma.site.findUnique({
      where: { id: siteId },
    });
  }
}
