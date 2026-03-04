import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getSummary: jest.fn(() =>
              Promise.resolve({
                globalProgress: 50,
                globalSpent: 1000,
                categories: [
                  { name: 'Voiles', progress: 60, spent: 600 },
                  { name: 'Planchers', progress: 40, spent: 400 },
                  { name: 'Poutres', progress: 0, spent: 0 },
                  { name: 'Superstructure', progress: 0, spent: 0 },
                ],
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard summary', async () => {
    const query: DashboardSummaryQueryDto = {};
    const result = await controller.getSummary(query);
    expect(result.globalProgress).toBe(50);
    expect(result.globalSpent).toBe(1000);
    expect(result.categories.length).toBe(4);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getSummary).toHaveBeenCalledWith(query);
  });

  it('should validate date format', async () => {
    const query: DashboardSummaryQueryDto = {
      startDate: 'invalid-date',
    };
    await expect(controller.getSummary(query)).rejects.toThrow();
  });

  it('should accept valid date format', async () => {
    const query: DashboardSummaryQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };
    const result = await controller.getSummary(query);
    expect(result).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getSummary).toHaveBeenCalledWith(query);
  });
});
