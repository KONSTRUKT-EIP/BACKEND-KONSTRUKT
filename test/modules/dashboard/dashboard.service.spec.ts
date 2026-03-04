import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockResourceFindMany: jest.Mock;
  let mockResourceUsageFindMany: jest.Mock;
  let mockDeliveryFindMany: jest.Mock;

  beforeEach(async () => {
    mockResourceFindMany = jest.fn();
    mockResourceUsageFindMany = jest.fn();
    mockDeliveryFindMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            resource: { findMany: mockResourceFindMany },
            resourceUsage: { findMany: mockResourceUsageFindMany },
            delivery: { findMany: mockDeliveryFindMany },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getRecentOrders', () => {
    it('should return mock orders with correct structure', async () => {
      const query = { page: 1, pageSize: 10 };
      mockDeliveryFindMany.mockResolvedValue([
        {
          id: 'order_1',
          createdAt: new Date(),
          quantity: 3,
          resource: {
            name: 'Armature 12mm',
            unitPrice: 120,
          },
        },
      ]);
      const result = await service.getRecentOrders(query);
      expect(result.orders).toBeInstanceOf(Array);
      expect(result.orders[0]).toHaveProperty('id');
      expect(result.orders[0]).toHaveProperty('productName');
      expect(result.orders[0]).toHaveProperty('productIcon');
      expect(result.orders[0]).toHaveProperty('price');
      expect(result.orders[0]).toHaveProperty('totalOrder');
      expect(result.orders[0]).toHaveProperty('total');
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct summary with resources and usages', async () => {
    const resources = [
      { id: 1, name: 'Voiles A', quantity: 10, unitPrice: 5 },
      { id: 2, name: 'Planchers B', quantity: 20, unitPrice: 2 },
    ];
    const usages = [
      { resourceId: 1, quantity: 2 },
      { resourceId: 2, quantity: 5 },
    ];
    mockResourceFindMany.mockResolvedValue(resources);
    mockResourceUsageFindMany.mockResolvedValue(usages);

    const query: DashboardSummaryQueryDto = {};
    const result = await service.getSummary(query);
    expect(result.globalProgress).toBeGreaterThanOrEqual(0);
    expect(result.globalSpent).toBeGreaterThanOrEqual(0);
    expect(result.categories.length).toBe(4);
    expect(result.categories[0]).toHaveProperty('name');
    expect(result.categories[0]).toHaveProperty('progress');
    expect(result.categories[0]).toHaveProperty('spent');
  });

  it('should handle empty resources and usages', async () => {
    mockResourceFindMany.mockResolvedValue([]);
    mockResourceUsageFindMany.mockResolvedValue([]);
    const query: DashboardSummaryQueryDto = {};
    const result = await service.getSummary(query);
    expect(result.globalProgress).toBe(0);
    expect(result.globalSpent).toBe(0);
    expect(result.categories.length).toBe(4);
    result.categories.forEach((cat) => {
      expect(cat.progress).toBe(0);
      expect(cat.spent).toBe(0);
    });
  });

  it('should filter usages by date if provided', async () => {
    mockResourceFindMany.mockResolvedValue([]);
    mockResourceUsageFindMany.mockResolvedValue([]);
    const query: DashboardSummaryQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };
    await service.getSummary(query);
    expect(mockResourceUsageFindMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      },
    });
  });
});
