import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { DashboardSummaryQueryDto } from '../../../src/modules/dashboard/dto/dashboard-summary.dto';

describe('DashboardService Integration', () => {
  let service: DashboardService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, PrismaService],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return summary with real DB (empty)', async () => {
    const query: DashboardSummaryQueryDto = {};
    const result = await service.getSummary(query);
    expect(result.globalProgress).toBeDefined();
    expect(result.globalSpent).toBeDefined();
    expect(result.categories.length).toBe(4);
  });
});
