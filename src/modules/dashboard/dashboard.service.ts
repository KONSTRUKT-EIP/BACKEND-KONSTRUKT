import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  DashboardSummaryQueryDto,
  DashboardSummaryResponseDto,
  CategoryKpiDto,
} from './dto/dashboard-summary.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    try {
      const resources = await this.prisma.resource.findMany();
      const usageQuery: Prisma.ResourceUsageFindManyArgs = {};
      if (query.startDate || query.endDate) {
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (query.startDate) {
          const startDate = new Date(query.startDate);
          if (isNaN(startDate.getTime())) {
            throw new Error(
              `Invalid startDate format: ${query.startDate}. Expected format: YYYY-MM-DD`,
            );
          }
          dateFilter.gte = startDate;
        }
        if (query.endDate) {
          const endDate = new Date(query.endDate);
          if (isNaN(endDate.getTime())) {
            throw new Error(
              `Invalid endDate format: ${query.endDate}. Expected format: YYYY-MM-DD`,
            );
          }
          dateFilter.lte = endDate;
        }
        usageQuery.where = { date: dateFilter };
      }
      const usages = await this.prisma.resourceUsage.findMany(usageQuery);

      const categories = ['Voiles', 'Planchers', 'Poutres', 'Superstructure'];

      const categoryKpis: CategoryKpiDto[] = categories.map((cat) => {
        const catResources = resources.filter((r) =>
          r.name.toLowerCase().includes(cat.toLowerCase()),
        );
        const catUsages = usages.filter((u) =>
          catResources.some((r) => r.id === u.resourceId),
        );
        const spent = catUsages.reduce((acc, u) => {
          const res = catResources.find((r) => r.id === u.resourceId);
          return res ? acc + Number(u.quantity) * Number(res.unitPrice) : acc;
        }, 0);
        const progress = Math.min(
          100,
          Math.round(
            (spent /
              (catResources.reduce(
                (acc, r) => acc + Number(r.quantity) * Number(r.unitPrice),
                0,
              ) || 1)) *
              100,
          ),
        );
        return { name: cat, progress, spent };
      });

      const globalProgress = Math.round(
        categoryKpis.reduce((acc, c) => acc + c.progress, 0) /
          categoryKpis.length,
      );
      const globalSpent = categoryKpis.reduce((acc, c) => acc + c.spent, 0);

      return {
        globalProgress,
        globalSpent,
        categories: categoryKpis,
      };
    } catch (error) {
      console.error('Error in getSummary:', error);
      throw error;
    }
  }
}
