import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';

describe('Dashboard Reports Endpoint (e2e)', () => {
  let app: INestApplication<App>;

  const mockResources = [
    {
      id: '1',
      siteId: 'site1',
      name: 'Voiles',
      type: 'MATERIAU',
      unit: 'm2',
      quantity: 100,
      unitPrice: 100,
      supplier: 'A',
      createdAt: new Date(),
    },
    {
      id: '2',
      siteId: 'site1',
      name: 'Planchers',
      type: 'MATERIAU',
      unit: 'm2',
      quantity: 50,
      unitPrice: 200,
      supplier: 'B',
      createdAt: new Date(),
    },
  ];

  const mockResourceUsages = [
    {
      id: 'u1',
      resourceId: '1',
      taskId: 't1',
      date: new Date('2024-01-10'),
      quantity: 50,
      notes: '',
      createdById: 'user1',
      createdAt: new Date(),
    },
    {
      id: 'u2',
      resourceId: '2',
      taskId: 't2',
      date: new Date('2024-02-10'),
      quantity: 10,
      notes: '',
      createdById: 'user1',
      createdAt: new Date(),
    },
  ];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        resource: {
          findMany: jest.fn().mockResolvedValue(mockResources),
        },
        resourceUsage: {
          findMany: jest.fn().mockResolvedValue(mockResourceUsages),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /dashboard/armature/reports should return 200 and valid data', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/dashboard/armature/reports?startDate=2024-01-01&endDate=2024-12-31&categories=Voiles,Planchers',
      )
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    const body = res.body as {
      kpiCards: any[];
      totalBudget: number;
      totalSpent: number;
      filters: any[];
      donutChart: { data: any[] };
    };

    expect(body.kpiCards.length).toBeGreaterThan(0);
    expect(body.totalBudget).toBeGreaterThan(0);
    expect(body.totalSpent).toBeGreaterThan(0);
    expect(body.filters.length).toBeGreaterThan(0);
    expect(body.donutChart.data.length).toBeGreaterThan(0);
  });

  it('GET /dashboard/armature/reports with invalid date should return 400', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/armature/reports?startDate=invalid-date')
      .set('Authorization', 'Bearer test-token')
      .expect(400);
  });
});
