import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';

describe('DashboardController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        resource: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        resourceUsage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/dashboard/armature/summary (GET) should return summary', async () => {
    interface DashboardSummaryResponse {
      globalProgress: number;
      globalSpent: number;
      categories: any[];
    }

    const response = await request(app.getHttpServer())
      .get('/dashboard/armature/summary')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    const responseBody = response.body as DashboardSummaryResponse;

    expect(responseBody).toHaveProperty('globalProgress');
    expect(responseBody).toHaveProperty('globalSpent');
    expect(responseBody).toHaveProperty('categories');
    expect(Array.isArray(responseBody.categories)).toBe(true);
  });
});
