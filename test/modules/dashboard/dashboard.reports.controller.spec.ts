import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { ArmatureReportsQueryDto } from '../../../src/modules/dashboard/dto/armature-reports.dto';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';

describe('DashboardController (reports)', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getReports: jest.fn().mockResolvedValue({
              kpiCards: [
                { label: 'Voiles', percentage: 80, spent: 10000 },
                { label: 'Planchers', percentage: 60, spent: 8000 },
              ],
              chartData: [],
              filters: [
                { id: 'voiles', label: 'Voiles' },
                { id: 'planchers', label: 'Planchers' },
              ],
              donutChart: {
                data: [
                  { name: 'Voiles', value: 10000 },
                  { name: 'Planchers', value: 8000 },
                ],
              },
              totalBudget: 25000,
              totalSpent: 18000,
              overallPercentage: 72,
            }),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return reports response', async () => {
    const query: ArmatureReportsQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      categories: 'voiles,planchers',
    };
    const result = await controller.getReports(query);
    expect(result.kpiCards.length).toBe(2);
    expect(result.totalBudget).toBe(25000);
    expect(result.totalSpent).toBe(18000);
    expect(result.overallPercentage).toBe(72);
  });

  it('should validate query params', async () => {
    await expect(
      controller.getReports({ startDate: 'invalid-date' }),
    ).rejects.toThrow();
  });
});
