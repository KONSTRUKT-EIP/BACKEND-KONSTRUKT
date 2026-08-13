import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

describe('DashboardService', () => {
  describe('getArmatureAnalytics', () => {
    it('should return analytics data with correct structure', async () => {
      mockResourceFindMany.mockResolvedValue([
        { id: 1, name: 'Voiles', quantity: 10, unitPrice: 5 },
        { id: 2, name: 'Planchers', quantity: 20, unitPrice: 2 },
      ]);
      mockResourceUsageFindMany.mockResolvedValue([
        { resourceId: 1, quantity: 2, date: new Date('2024-01-01') },
        { resourceId: 2, quantity: 5, date: new Date('2024-01-02') },
      ]);
      const query = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const result = await service.getArmatureAnalytics(query);
      expect(result).toHaveProperty('kpiCards');
      expect(result).toHaveProperty('chartData');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('donutChart');
      expect(result).toHaveProperty('totalBudget');
      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('overallPercentage');
    });
  });
  let service: DashboardService;
  let mockResourceFindMany: jest.Mock;
  let mockResourceFindFirst: jest.Mock;
  let mockResourceUsageFindMany: jest.Mock;
  let mockDeliveryFindMany: jest.Mock;
  let mockDeliveryCreate: jest.Mock;

  beforeEach(async () => {
    mockResourceFindMany = jest.fn();
    mockResourceFindFirst = jest.fn();
    mockResourceUsageFindMany = jest.fn();
    mockDeliveryFindMany = jest.fn();
    mockDeliveryCreate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            resource: {
              findMany: mockResourceFindMany,
              findFirst: mockResourceFindFirst,
            },
            resourceUsage: { findMany: mockResourceUsageFindMany },
            delivery: {
              findMany: mockDeliveryFindMany,
              create: mockDeliveryCreate,
            },
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

  // ─── getSummary — summaryState caching ──────────────────────────────────
  describe('getSummary() with stored summaryState', () => {
    it('should return stored summaryState without querying the DB', async () => {
      const stored = {
        globalProgress: 75,
        globalSpent: 5000,
        categories: [{ id: 1, name: 'Voiles', progress: 75, spent: 5000 }],
      };
      // Seed the state directly
      service['summaryState'] = stored;

      const result = await service.getSummary({});

      expect(result).toEqual(stored);
      expect(mockResourceFindMany).not.toHaveBeenCalled();
      expect(mockResourceUsageFindMany).not.toHaveBeenCalled();
    });
  });

  // ─── createSummary ───────────────────────────────────────────────────────
  describe('createSummary()', () => {
    it('should store the summary and return it', () => {
      const input = {
        globalProgress: 60,
        globalSpent: 3000,
        categories: [
          { id: 1, name: 'Voiles', progress: 60, spent: 3000 },
        ],
      };

      const result = service.createSummary(input);

      expect(result).toEqual(input);
      expect(service['summaryState']).toEqual(input);
    });

    it('should deep-clone categories so mutations do not affect the stored state', () => {
      const cats = [{ id: 1, name: 'Voiles', progress: 50, spent: 1000 }];
      service.createSummary({ globalProgress: 50, globalSpent: 1000, categories: cats });

      // Mutate the original array after storing
      cats[0].progress = 99;

      expect(service['summaryState']!.categories[0].progress).toBe(50);
    });

    it('should make getSummary return the stored state on next call', async () => {
      const input = {
        globalProgress: 42,
        globalSpent: 420,
        categories: [{ id: 1, name: 'Voiles', progress: 42, spent: 420 }],
      };
      service.createSummary(input);

      const result = await service.getSummary({});

      expect(result).toEqual(input);
      expect(mockResourceFindMany).not.toHaveBeenCalled();
    });
  });

  // ─── getAllOrders ────────────────────────────────────────────────────────
  describe('getAllOrders()', () => {
    it('should return all deliveries mapped to OrderDto shape', async () => {
      mockDeliveryFindMany.mockResolvedValue([
        {
          id: 'del-1',
          createdAt: new Date(),
          quantity: 5,
          resource: { name: 'Armature 12mm', unitPrice: 100 },
        },
        {
          id: 'del-2',
          createdAt: new Date(),
          quantity: 2,
          resource: { name: 'Poutre HEA200', unitPrice: 250 },
        },
      ]);

      const result = await service.getAllOrders();

      expect(result.orders).toHaveLength(2);
      expect(result.orders[0]).toEqual({
        id: 'del-1',
        productName: 'Armature 12mm',
        productIcon: '',
        price: 100,
        totalOrder: 5,
        total: 500,
      });
      expect(mockDeliveryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should return an empty orders array when there are no deliveries', async () => {
      mockDeliveryFindMany.mockResolvedValue([]);

      const result = await service.getAllOrders();

      expect(result.orders).toEqual([]);
    });
  });

  // ─── createOrder ─────────────────────────────────────────────────────────
  describe('createOrder()', () => {
    const orderData = {
      productName: 'Armature 12mm',
      productIcon: '',
      price: 100,
      totalOrder: 5,
      total: 500,
    };

    const mockResource = {
      id: 'res-1',
      name: 'Armature 12mm',
      unitPrice: 100,
      siteId: 'site-1',
      supplier: 'Acier SA',
    };

    const mockDelivery = {
      id: 'del-new',
      quantity: 5,
      resource: { name: 'Armature 12mm', unitPrice: 100 },
    };

    it('should create a delivery when a matching resource is found by name', async () => {
      mockResourceFindFirst
        .mockResolvedValueOnce(mockResource); // name match
      mockDeliveryCreate.mockResolvedValue(mockDelivery);

      const result = await service.createOrder(orderData);

      expect(mockDeliveryCreate).toHaveBeenCalledTimes(1);
      expect(result.orders[0].id).toBe('del-new');
      expect(result.orders[0].productName).toBe('Armature 12mm');
    });

    it('should fall back to first resource when name does not match', async () => {
      mockResourceFindFirst
        .mockResolvedValueOnce(null)     // no name match
        .mockResolvedValueOnce(mockResource); // fallback
      mockDeliveryCreate.mockResolvedValue(mockDelivery);

      const result = await service.createOrder({ ...orderData, productName: 'Unknown' });

      expect(result.orders[0].id).toBe('del-new');
    });

    it('should return a transient order (no DB create) when no resource exists', async () => {
      mockResourceFindFirst
        .mockResolvedValueOnce(null) // no name match
        .mockResolvedValueOnce(null); // no fallback

      const result = await service.createOrder(orderData);

      expect(mockDeliveryCreate).not.toHaveBeenCalled();
      expect(result.orders[0].productName).toBe('Armature 12mm');
      expect(typeof result.orders[0].id).toBe('string');
    });
  });

  // ─── getResources ─────────────────────────────────────────────────────────
  describe('getResources()', () => {
    it('should return resources mapped to plain objects with numeric unitPrice', async () => {
      mockResourceFindMany.mockResolvedValue([
        {
          id: 'res-1',
          name: 'Armature 12mm',
          type: 'STEEL',
          unit: 'kg',
          unitPrice: '120.50',
          supplier: 'Acier SA',
          siteId: 'site-1',
        },
      ]);

      const result = await service.getResources();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'res-1',
        name: 'Armature 12mm',
        type: 'STEEL',
        unit: 'kg',
        unitPrice: 120.5,
        supplier: 'Acier SA',
        siteId: 'site-1',
      });
      expect(mockResourceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should return an empty array when there are no resources', async () => {
      mockResourceFindMany.mockResolvedValue([]);

      const result = await service.getResources();

      expect(result).toEqual([]);
    });
  });
});
