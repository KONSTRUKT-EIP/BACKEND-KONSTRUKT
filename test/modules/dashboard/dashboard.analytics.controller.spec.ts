import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { ArmatureReportsQueryDto } from '../../../src/modules/dashboard/dto/armature-reports.dto';

describe('DashboardController - getArmatureAnalytics', () => {
  let controller: DashboardController;
  let service: DashboardService;
  const mockRequest = { user: { organizationId: 'org-a' } } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getArmatureAnalytics: jest.fn(() =>
              Promise.resolve({
                kpiCards: [],
                chartData: [],
                filters: [],
                donutChart: { data: [] },
                totalBudget: 1000,
                totalSpent: 500,
                overallPercentage: 50,
              }),
            ),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should return analytics data with correct structure', async () => {
    const query: ArmatureReportsQueryDto = {};
    const result = await controller.getArmatureAnalytics(query, mockRequest);
    expect(result).toHaveProperty('kpiCards');
    expect(result).toHaveProperty('chartData');
    expect(result).toHaveProperty('filters');
    expect(result).toHaveProperty('donutChart');
    expect(result).toHaveProperty('totalBudget');
    expect(result).toHaveProperty('totalSpent');
    expect(result).toHaveProperty('overallPercentage');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getArmatureAnalytics).toHaveBeenCalledWith(query, 'org-a');
  });

  it('should validate date format', async () => {
    const query: ArmatureReportsQueryDto = {
      startDate: 'invalid-date',
    };
    await expect(controller.getArmatureAnalytics(query, mockRequest)).rejects.toThrow();
  });

  it('should accept valid date format', async () => {
    const query: ArmatureReportsQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };
    const result = await controller.getArmatureAnalytics(query, mockRequest);
    expect(result).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getArmatureAnalytics).toHaveBeenCalledWith(query, 'org-a');
  });
});
