import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DashboardController } from '../../../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

const mockSummaryResponse = {
  globalProgress: 50,
  globalSpent: 1000,
  categories: [
    { id: 1, name: 'Voiles', progress: 60, spent: 600 },
    { id: 2, name: 'Planchers', progress: 40, spent: 400 },
    { id: 3, name: 'Poutres', progress: 0, spent: 0 },
    { id: 4, name: 'Superstructure', progress: 0, spent: 0 },
  ],
};

const mockOrdersResponse = {
  orders: [
    {
      id: 'order_1',
      productName: 'Armature 12mm',
      productIcon: 'https://cdn.konstrukt.com/icons/armature12.png',
      price: 120,
      totalOrder: 3,
      total: 360,
    },
  ],
};

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue(mockSummaryResponse),
            createSummary: jest.fn().mockReturnValue(mockSummaryResponse),
            getRecentOrders: jest.fn().mockResolvedValue(mockOrdersResponse),
            getAllOrders: jest.fn().mockResolvedValue(mockOrdersResponse),
            createOrder: jest.fn().mockResolvedValue(mockOrdersResponse),
            getResources: jest.fn().mockResolvedValue([
              { id: 'res-1', name: 'Armature 12mm', type: 'STEEL', unit: 'kg', unitPrice: 120, supplier: 'Acier SA', siteId: 'site-1' },
            ]),
            getArmatureAnalytics: jest.fn().mockResolvedValue({
              kpiCards: [],
              chartData: [],
              filters: [],
              donutChart: { data: [] },
              totalBudget: 0,
              totalSpent: 0,
              overallPercentage: 0,
            }),
            getReports: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── getSummary ───────────────────────────────────────────────────────────
  describe('getSummary()', () => {
    it('should return dashboard summary', async () => {
      const query: DashboardSummaryQueryDto = {};
      const result = await controller.getSummary(query);

      expect(result.globalProgress).toBe(50);
      expect(result.globalSpent).toBe(1000);
      expect(result.categories).toHaveLength(4);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getSummary).toHaveBeenCalledWith(query);
    });

    it('should throw BadRequestException for invalid date format', async () => {
      await expect(
        controller.getSummary({ startDate: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid YYYY-MM-DD dates', async () => {
      const query: DashboardSummaryQueryDto = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const result = await controller.getSummary(query);

      expect(result).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getSummary).toHaveBeenCalledWith(query);
    });
  });

  // ─── createSummary ────────────────────────────────────────────────────────
  describe('createSummary()', () => {
    it('should store and return the summary when input is valid', () => {
      const dto = {
        globalProgress: 60,
        globalSpent: 3000,
        categories: [{ id: 1, name: 'Voiles', progress: 60, spent: 3000 }],
      };

      const result = controller.createSummary(dto as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createSummary).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSummaryResponse);
    });

    it('should throw BadRequestException when categories contain non-integer id', () => {
      const dto = {
        globalProgress: 50,
        globalSpent: 1000,
        categories: [{ id: 1.5, name: 'Voiles', progress: 50, spent: 1000 }],
      };

      expect(() => controller.createSummary(dto as any)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when globalProgress is out of range', () => {
      const dto = {
        globalProgress: 150, // > 100
        globalSpent: 1000,
        categories: [],
      };

      expect(() => controller.createSummary(dto as any)).toThrow(BadRequestException);
    });
  });

  // ─── getAllOrders ─────────────────────────────────────────────────────────
  describe('getAllOrders()', () => {
    it('should return all orders from the service', async () => {
      const result = await controller.getAllOrders();

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]).toHaveProperty('id');
      expect(result.orders[0]).toHaveProperty('productName');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAllOrders).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getRecentOrders ──────────────────────────────────────────────────────
  describe('getRecentOrders()', () => {
    it('should return paginated orders', async () => {
      const query = { page: 1, pageSize: 10 };
      const result = await controller.getRecentOrders(query);

      expect(result.orders).toBeInstanceOf(Array);
      expect(result.orders[0]).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getRecentOrders).toHaveBeenCalledWith(query);
    });

    it('should throw BadRequestException for invalid page query', async () => {
      await expect(
        controller.getRecentOrders({ page: -1 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── createOrder ──────────────────────────────────────────────────────────
  describe('createOrder()', () => {
    it('should create and return an order when input is valid', async () => {
      const dto = {
        productName: 'Armature 12mm',
        productIcon: '',
        price: 120,
        totalOrder: 5,
        total: 600,
      };

      const result = await controller.createOrder(dto as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createOrder).toHaveBeenCalledWith(dto);
      expect(result.orders[0].productName).toBe('Armature 12mm');
    });

    it('should throw BadRequestException when totalOrder is zero', async () => {
      const dto = {
        productName: 'Armature 12mm',
        price: 120,
        totalOrder: 0, // min is 1
        total: 0,
      };

      await expect(
        controller.createOrder(dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getResources ─────────────────────────────────────────────────────────
  describe('getResources()', () => {
    it('should return list of resources from the service', async () => {
      const result = await controller.getResources();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('unitPrice');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getResources).toHaveBeenCalledTimes(1);
    });
  });
});

