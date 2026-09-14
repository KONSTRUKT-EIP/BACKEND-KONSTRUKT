import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { ArmatureReportsQueryDto } from '../../../src/modules/dashboard/dto/armature-reports.dto';

describe('DashboardService Integration - getArmatureAnalytics', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  const organizationId = 'org-a';

  beforeAll(async () => {
    const mockPrismaService = {
      resource: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', name: 'Voiles', unitPrice: 100, quantity: 10 },
          { id: '2', name: 'Planchers', unitPrice: 200, quantity: 5 },
        ]),
      },
      resourceUsage: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '1',
            resourceId: '1',
            quantity: 5,
            date: new Date('2026-03-01'),
          },
          {
            id: '2',
            resourceId: '2',
            quantity: 2,
            date: new Date('2026-03-02'),
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return analytics data with mocked data', async () => {
    const query: ArmatureReportsQueryDto = {};
    const result = await service.getArmatureAnalytics(query, organizationId);
    expect(result.kpiCards).toBeDefined();
    expect(result.chartData).toBeDefined();
    expect(result.filters).toBeDefined();
    expect(result.donutChart).toBeDefined();
    expect(result.totalBudget).toBeDefined();
    expect(result.totalSpent).toBeDefined();
    expect(result.overallPercentage).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.resource.findMany).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.resourceUsage.findMany).toHaveBeenCalled();
  });
});
