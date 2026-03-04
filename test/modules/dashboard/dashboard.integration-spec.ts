import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

describe('DashboardService Integration', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const mockPrismaService = {
      resource: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '1',
            name: 'Voiles',
            unitPrice: 100,
            quantity: 10,
          },
          {
            id: '2',
            name: 'Planchers',
            unitPrice: 200,
            quantity: 5,
          },
          {
            id: '3',
            name: 'Poutres',
            unitPrice: 150,
            quantity: 8,
          },
          {
            id: '4',
            name: 'Superstructure',
            unitPrice: 300,
            quantity: 3,
          },
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return summary with mocked data', async () => {
    const query: DashboardSummaryQueryDto = {};
    const result = await service.getSummary(query);
    
    expect(result.globalProgress).toBeDefined();
    expect(result.globalSpent).toBeDefined();
    expect(result.categories.length).toBe(4);
    expect(result.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Voiles' }),
        expect.objectContaining({ name: 'Planchers' }),
        expect.objectContaining({ name: 'Poutres' }),
        expect.objectContaining({ name: 'Superstructure' }),
      ]),
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.resource.findMany).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.resourceUsage.findMany).toHaveBeenCalled();
  });

  it('should filter by date range', async () => {
    const query: DashboardSummaryQueryDto = {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    };
    const result = await service.getSummary(query);

    expect(result.globalProgress).toBeDefined();
    expect(result.globalSpent).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.resourceUsage.findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2026-03-01'),
          lte: new Date('2026-03-31'),
        },
      },
    });
  });
});
