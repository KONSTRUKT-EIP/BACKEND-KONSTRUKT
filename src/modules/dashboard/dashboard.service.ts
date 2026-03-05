import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  DashboardSummaryQueryDto,
  DashboardSummaryResponseDto,
  CategoryKpiDto,
} from './dto/dashboard-summary.dto';
import {
  ArmatureReportsQueryDto,
  ArmatureReportsResponseDto,
  KpiCardDataDto,
  ChartDataPointDto,
  FilterDto,
  AnalyticsDonutDto,
  DonutDataPointDto,
} from './dto/armature-reports.dto';
import { RecentOrdersQueryDto } from './dto/recent-orders.query.dto';
import { RecentOrdersResponseDto, OrderDto } from './dto/recent-orders.dto';

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
          dateFilter.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          dateFilter.lte = new Date(query.endDate);
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

  async getRecentOrders(
    query: RecentOrdersQueryDto,
  ): Promise<RecentOrdersResponseDto> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    const where: Prisma.DeliveryFindManyArgs['where'] = {};

    if (query.startDate || query.endDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.lte = endDate;
      }
      where.createdAt = dateFilter;
    }

    const deliveries = await this.prisma.delivery.findMany({
      where,
      include: {
        resource: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const orders: OrderDto[] = deliveries.map((delivery) => ({
      id: delivery.id,
      productName: delivery.resource.name,
      productIcon: '',
      price: Number(delivery.resource.unitPrice),
      totalOrder: Number(delivery.quantity),
      total: Number(delivery.quantity) * Number(delivery.resource.unitPrice),
    }));

    return { orders };
  }

  async getReports(
    query: ArmatureReportsQueryDto,
  ): Promise<ArmatureReportsResponseDto> {
    return this.getArmatureAnalytics(query);
  }

  async getArmatureAnalytics(
    query: ArmatureReportsQueryDto,
  ): Promise<ArmatureReportsResponseDto> {
    try {
      const parsedCategories: string[] =
        typeof query.categories === 'string'
          ? query.categories
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [];

      const categoryList: string[] = parsedCategories.length
        ? parsedCategories
        : ['Voiles', 'Planchers', 'Poutres', 'Superstructure'];

      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }

      const resources = await this.prisma.resource.findMany();

      const usages = await this.prisma.resourceUsage.findMany({
        where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
        orderBy: { date: 'asc' },
      });

      const kpiCards: KpiCardDataDto[] = categoryList.map((category) => {
        const catResources = resources.filter((r) =>
          r.name.toLowerCase().includes(category.toLowerCase()),
        );
        const catUsages = usages.filter((u) =>
          catResources.some((r) => r.id === u.resourceId),
        );

        const spent = catUsages.reduce((acc, u) => {
          const res = catResources.find((r) => r.id === u.resourceId);
          return res ? acc + Number(u.quantity) * Number(res.unitPrice) : acc;
        }, 0);

        const totalBudget = catResources.reduce(
          (acc, r) => acc + Number(r.quantity) * Number(r.unitPrice),
          0,
        );

        const percentage =
          totalBudget > 0
            ? Math.min(100, Math.round((spent / totalBudget) * 100))
            : 0;

        return {
          label: category,
          percentage,
          spent: Math.round(spent),
        };
      });

      const chartDataMap = new Map<string, Record<string, number>>();

      usages.forEach((usage) => {
        const date = new Date(usage.date);
        const timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!chartDataMap.has(timeKey)) {
          chartDataMap.set(timeKey, {});
        }

        const resource = resources.find((r) => r.id === usage.resourceId);
        if (resource) {
          const category = categoryList.find((cat) =>
            resource.name.toLowerCase().includes(cat.toLowerCase()),
          );

          if (category) {
            const catKey = category.toLowerCase();
            const currentMap = chartDataMap.get(timeKey)!;
            currentMap[catKey] =
              (currentMap[catKey] || 0) +
              Number(usage.quantity) * Number(resource.unitPrice);
          }
        }
      });

      const chartData: ChartDataPointDto[] = Array.from(chartDataMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, values]) => ({
          time,
          voiles: Math.round(values['voiles'] || 0),
          planchers: Math.round(values['planchers'] || 0),
          poutres: Math.round(values['poutres'] || 0),
          superstructure: Math.round(values['superstructure'] || 0),
        }));

      const filters: FilterDto[] = categoryList.map((category) => ({
        id: category.toLowerCase(),
        label: category,
      }));
      const donutData: DonutDataPointDto[] = kpiCards.map((kpi) => ({
        name: kpi.label,
        value: kpi.spent,
      }));

      const totalSpent = kpiCards.reduce((acc, kpi) => acc + kpi.spent, 0);
      const totalBudget = resources.reduce(
        (acc, r) => acc + Number(r.quantity) * Number(r.unitPrice),
        0,
      );
      const overallPercentage =
        totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

      const donutChart: AnalyticsDonutDto = {
        data: donutData,
      };

      return {
        kpiCards,
        chartData,
        filters,
        donutChart,
        totalBudget: Math.round(totalBudget),
        totalSpent: Math.round(totalSpent),
        overallPercentage,
      };
    } catch (error) {
      console.error('Error in getArmatureAnalytics:', error);
      throw error;
    }
  }
}
