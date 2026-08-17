import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';
import { DeliveriesService } from '../../../src/modules/deliveries/deliveries.service';

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
  let mockResourceUsageFindMany: jest.Mock;
  let mockDeliveriesGetRecentOrders: jest.Mock;
  let mockDeliveriesGetAllOrders: jest.Mock;
  let mockDeliveriesCreateOrder: jest.Mock;

  beforeEach(async () => {
    mockResourceFindMany = jest.fn();
    mockResourceUsageFindMany = jest.fn();
    mockDeliveriesGetRecentOrders = jest.fn();
    mockDeliveriesGetAllOrders = jest.fn();
    mockDeliveriesCreateOrder = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            resource: {
              findMany: mockResourceFindMany,
            },
            resourceUsage: { findMany: mockResourceUsageFindMany },
          },
        },
        {
          provide: DeliveriesService,
          useValue: {
            getRecentOrders: mockDeliveriesGetRecentOrders,
            getAllOrders: mockDeliveriesGetAllOrders,
            createOrder: mockDeliveriesCreateOrder,
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getRecentOrders', () => {
    it('should delegate to DeliveriesService and return orders', async () => {
      const query = { page: 1, pageSize: 10 };
      mockDeliveriesGetRecentOrders.mockResolvedValue({
        orders: [
          {
            id: 'order_1',
            productName: 'Armature 12mm',
            productIcon: '',
            price: 120,
            totalOrder: 3,
            total: 360,
          },
        ],
      });

      const result = await service.getRecentOrders(query);

      expect(mockDeliveriesGetRecentOrders).toHaveBeenCalledWith(query);
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
    it('should delegate to DeliveriesService and return mapped orders', async () => {
      mockDeliveriesGetAllOrders.mockResolvedValue({
        orders: [
          {
            id: 'del-1',
            productName: 'Armature 12mm',
            productIcon: '',
            price: 100,
            totalOrder: 5,
            total: 500,
          },
          {
            id: 'del-2',
            productName: 'Poutre HEA200',
            productIcon: '',
            price: 250,
            totalOrder: 2,
            total: 500,
          },
        ],
      });

      const result = await service.getAllOrders();

      expect(result.orders).toHaveLength(2);
      expect(mockDeliveriesGetAllOrders).toHaveBeenCalledTimes(1);
    });

    it('should return an empty orders array when there are no deliveries', async () => {
      mockDeliveriesGetAllOrders.mockResolvedValue({ orders: [] });

      const result = await service.getAllOrders();

      expect(result.orders).toEqual([]);
    });
  });

  // ─── createOrder ─────────────────────────────────────────────────────────
  describe('createOrder()', () => {
    it('should delegate order creation to DeliveriesService', async () => {
      const orderData = {
        productName: 'Armature 12mm',
        productIcon: '',
        price: 100,
        totalOrder: 5,
        total: 500,
      };

      mockDeliveriesCreateOrder.mockResolvedValue({
        orders: [
          {
            id: 'del-new',
            productName: 'Armature 12mm',
            productIcon: '',
            price: 100,
            totalOrder: 5,
            total: 500,
          },
        ],
      });

      const result = await service.createOrder(orderData);

      expect(mockDeliveriesCreateOrder).toHaveBeenCalledWith(orderData);
      expect(result.orders[0].id).toBe('del-new');
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
