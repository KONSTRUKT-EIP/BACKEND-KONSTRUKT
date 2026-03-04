import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { ArmatureReportsQueryDto } from '../../../src/modules/dashboard/dto/armature-reports.dto';

describe('DashboardService (reports)', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      resource: { findMany: jest.fn() },
      resourceUsage: { findMany: jest.fn() },
    } as Partial<PrismaService> as PrismaService;
    service = new DashboardService(prisma);
  });

  it('should return correct KPI cards and totals', async () => {
    (prisma.resource.findMany as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Voiles', quantity: 100, unitPrice: 100 },
      { id: '2', name: 'Planchers', quantity: 50, unitPrice: 200 },
    ]);
    (prisma.resourceUsage.findMany as jest.Mock).mockResolvedValue([
      { resourceId: '1', quantity: 50, date: new Date('2024-01-10') },
      { resourceId: '2', quantity: 10, date: new Date('2024-02-10') },
    ]);
    const query: ArmatureReportsQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      categories: 'Voiles,Planchers',
    };
    const result = await service.getReports(query);
    expect(result.kpiCards).toEqual([
      { label: 'Voiles', percentage: 50, spent: 5000 },
      { label: 'Planchers', percentage: 40, spent: 2000 },
    ]);
    expect(result.totalBudget).toBe(20000);
    expect(result.totalSpent).toBe(7000);
    expect(result.overallPercentage).toBe(35);
  });

  it('should handle empty resources/usages', async () => {
    (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.resourceUsage.findMany as jest.Mock).mockResolvedValue([]);
    const query: ArmatureReportsQueryDto = {};
    const result = await service.getReports(query);
    expect(result.kpiCards).toEqual([
      { label: 'Voiles', percentage: 0, spent: 0 },
      { label: 'Planchers', percentage: 0, spent: 0 },
      { label: 'Poutres', percentage: 0, spent: 0 },
      { label: 'Superstructure', percentage: 0, spent: 0 },
    ]);
    expect(result.totalBudget).toBe(0);
    expect(result.totalSpent).toBe(0);
    expect(result.overallPercentage).toBe(0);
  });
});
