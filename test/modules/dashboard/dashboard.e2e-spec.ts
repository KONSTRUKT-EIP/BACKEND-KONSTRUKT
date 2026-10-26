import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';

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
        delivery: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context: any) => {
          context.switchToHttp().getRequest().user = { organizationId: 'org-a' };
          return true;
        }),
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/dashboard/armature/analytics (GET) should return analytics data', async () => {
    interface AnalyticsResponse {
      kpiCards: any[];
      chartData: any[];
      filters: any[];
      donutChart: { data: any[] };
      totalBudget: number;
      totalSpent: number;
      overallPercentage: number;
    }
    const response = await request(app.getHttpServer())
      .get(
        '/dashboard/armature/analytics?startDate=2024-01-01&endDate=2024-12-31',
      )
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    const responseBody = response.body as AnalyticsResponse;
    expect(responseBody).toHaveProperty('kpiCards');
    expect(responseBody).toHaveProperty('chartData');
    expect(responseBody).toHaveProperty('filters');
    expect(responseBody).toHaveProperty('donutChart');
    expect(responseBody).toHaveProperty('totalBudget');
    expect(responseBody).toHaveProperty('totalSpent');
    expect(responseBody).toHaveProperty('overallPercentage');
  });

  it('/dashboard/armature/orders/recent (GET) should return recent orders', async () => {
    interface Order {
      id: string;
      productName: string;
      productIcon: string;
      price: number;
      totalOrder: number;
      total: number;
    }
    interface RecentOrdersResponse {
      orders: Order[];
    }
    const response = await request(app.getHttpServer())
      .get('/dashboard/armature/orders/recent?page=1&pageSize=2')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    const responseBody = response.body as RecentOrdersResponse;
    expect(responseBody).toHaveProperty('orders');
    expect(Array.isArray(responseBody.orders)).toBe(true);
    if (responseBody.orders.length > 0) {
      const order = responseBody.orders[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('productName');
      expect(order).toHaveProperty('productIcon');
      expect(order).toHaveProperty('price');
      expect(order).toHaveProperty('totalOrder');
      expect(order).toHaveProperty('total');
    }
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
