import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';

describe('GenericTableController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const mockSiteId = '550e8400-e29b-41d4-a716-446655440001';
  const mockTableId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRowId = '550e8400-e29b-41d4-a716-446655440002';

  const mockTable = {
    id: mockTableId,
    name: 'E2E Test Table',
    columns: { name: 'string', quantity: 'number', price: 'number' },
    siteId: mockSiteId,
    createdAt: new Date(),
    updatedAt: new Date(),
    rows: [],
  };

  const mockRow = {
    id: mockRowId,
    tableId: mockTableId,
    data: { name: 'Test Item', quantity: 10, price: 99.99 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        genericTable: {
          create: jest.fn().mockResolvedValue(mockTable),
          findUnique: jest.fn().mockResolvedValue(mockTable),
          findMany: jest.fn().mockResolvedValue([mockTable]),
          update: jest.fn().mockResolvedValue(mockTable),
          delete: jest.fn().mockResolvedValue(mockTable),
        },
        genericTableRow: {
          create: jest.fn().mockResolvedValue(mockRow),
          findUnique: jest.fn().mockResolvedValue(mockRow),
          findMany: jest.fn().mockResolvedValue([mockRow]),
          update: jest.fn().mockResolvedValue(mockRow),
          delete: jest.fn().mockResolvedValue(mockRow),
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
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/dashboard/tables (POST)', () => {
    it('should create a new table', async () => {
      interface CreateTableResponse {
        id: string;
        name: string;
        columns: object;
        siteId: string;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .post('/dashboard/tables')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'E2E Test Table',
          columns: { name: 'string', quantity: 'number', price: 'number' },
          siteId: mockSiteId,
        })
        .expect(201);

      const responseBody = response.body as CreateTableResponse;
      expect(responseBody).toHaveProperty('id');
      expect(responseBody).toHaveProperty('name', 'E2E Test Table');
      expect(responseBody).toHaveProperty('columns');
      expect(responseBody).toHaveProperty('siteId', mockSiteId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.create).toHaveBeenCalled();
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/dashboard/tables')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Table',
          // Missing columns and siteId
        })
        .expect(400);
    });
  });

  describe('/dashboard/tables (GET)', () => {
    it('should list all tables', async () => {
      interface Table {
        id: string;
        name: string;
        columns: object;
        siteId: string;
        createdAt: string;
        updatedAt: string;
        rows: any[];
      }

      const response = await request(app.getHttpServer())
        .get('/dashboard/tables')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      const responseBody = response.body as Table[];
      expect(Array.isArray(responseBody)).toBe(true);
      if (responseBody.length > 0) {
        const table = responseBody[0];
        expect(table).toHaveProperty('id');
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('columns');
        expect(table).toHaveProperty('siteId');
        expect(table).toHaveProperty('rows');
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalled();
    });

    it('should filter tables by siteId', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/tables?siteId=${mockSiteId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalledWith({
        where: { siteId: mockSiteId },
        include: { rows: true },
      });
    });
  });

  describe('/dashboard/tables/:id (GET)', () => {
    it('should get a table by ID', async () => {
      interface TableWithRows {
        id: string;
        name: string;
        columns: object;
        siteId: string;
        createdAt: string;
        updatedAt: string;
        rows: any[];
      }

      const response = await request(app.getHttpServer())
        .get(`/dashboard/tables/${mockTableId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      const responseBody = response.body as TableWithRows;
      expect(responseBody).toHaveProperty('id', mockTableId);
      expect(responseBody).toHaveProperty('name');
      expect(responseBody).toHaveProperty('columns');
      expect(responseBody).toHaveProperty('rows');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findUnique).toHaveBeenCalledWith({
        where: { id: mockTableId },
        include: { rows: true },
      });
    });
  });

  describe('/dashboard/tables/:id (PUT)', () => {
    it('should update a table', async () => {
      interface UpdatedTable {
        id: string;
        name: string;
        columns: object;
        siteId: string;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .put(`/dashboard/tables/${mockTableId}`)
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Updated Table Name',
        })
        .expect(200);

      const responseBody = response.body as UpdatedTable;
      expect(responseBody).toHaveProperty('id', mockTableId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.update).toHaveBeenCalledWith({
        where: { id: mockTableId },
        data: { name: 'Updated Table Name' },
      });
    });
  });

  describe('/dashboard/tables/:id (DELETE)', () => {
    it('should delete a table', async () => {
      await request(app.getHttpServer())
        .delete(`/dashboard/tables/${mockTableId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.delete).toHaveBeenCalledWith({
        where: { id: mockTableId },
      });
    });
  });

  describe('/dashboard/tables/:tableId/rows (POST)', () => {
    it('should add a row to a table', async () => {
      interface CreatedRow {
        id: string;
        tableId: string;
        data: Record<string, any>;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .post(`/dashboard/tables/${mockTableId}/rows`)
        .set('Authorization', 'Bearer test-token')
        .send({
          tableId: mockTableId,
          data: { name: 'Test Item', quantity: 10, price: 99.99 },
        })
        .expect(201);

      const responseBody = response.body as CreatedRow;
      expect(responseBody).toHaveProperty('id');
      expect(responseBody).toHaveProperty('tableId', mockTableId);
      expect(responseBody).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.create).toHaveBeenCalled();
    });

    it('should return 400 for invalid row data', async () => {
      await request(app.getHttpServer())
        .post(`/dashboard/tables/${mockTableId}/rows`)
        .set('Authorization', 'Bearer test-token')
        .send({
          // Missing tableId and data
        })
        .expect(400);
    });
  });

  describe('/dashboard/tables/:tableId/rows (GET)', () => {
    it('should list all rows in a table', async () => {
      interface Row {
        id: string;
        tableId: string;
        data: Record<string, any>;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .get(`/dashboard/tables/${mockTableId}/rows`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      const responseBody = response.body as Row[];
      expect(Array.isArray(responseBody)).toBe(true);
      if (responseBody.length > 0) {
        const row = responseBody[0];
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('tableId');
        expect(row).toHaveProperty('data');
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.findMany).toHaveBeenCalledWith({
        where: { tableId: mockTableId },
      });
    });
  });

  describe('/dashboard/tables/rows/:id (GET)', () => {
    it('should get a row by ID', async () => {
      interface Row {
        id: string;
        tableId: string;
        data: Record<string, any>;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .get(`/dashboard/tables/rows/${mockRowId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      const responseBody = response.body as Row;
      expect(responseBody).toHaveProperty('id', mockRowId);
      expect(responseBody).toHaveProperty('tableId');
      expect(responseBody).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.findUnique).toHaveBeenCalledWith({
        where: { id: mockRowId },
      });
    });
  });

  describe('/dashboard/tables/rows/:id (PUT)', () => {
    it('should update a row', async () => {
      interface UpdatedRow {
        id: string;
        tableId: string;
        data: Record<string, any>;
        createdAt: string;
        updatedAt: string;
      }

      const response = await request(app.getHttpServer())
        .put(`/dashboard/tables/rows/${mockRowId}`)
        .set('Authorization', 'Bearer test-token')
        .send({
          data: { name: 'Updated Item', quantity: 20, price: 199.99 },
        })
        .expect(200);

      const responseBody = response.body as UpdatedRow;
      expect(responseBody).toHaveProperty('id', mockRowId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.update).toHaveBeenCalledWith({
        where: { id: mockRowId },
        data: { data: { name: 'Updated Item', quantity: 20, price: 199.99 } },
      });
    });
  });

  describe('/dashboard/tables/rows/:id (DELETE)', () => {
    it('should delete a row', async () => {
      await request(app.getHttpServer())
        .delete(`/dashboard/tables/rows/${mockRowId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.delete).toHaveBeenCalledWith({
        where: { id: mockRowId },
      });
    });
  });

  describe('Complete workflow', () => {
    it('should create table, add rows, update, and delete', async () => {
      // Create table
      await request(app.getHttpServer())
        .post('/dashboard/tables')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Workflow Test Table',
          columns: { name: 'string', value: 'number' },
          siteId: mockSiteId,
        })
        .expect(201);

      // Add row
      await request(app.getHttpServer())
        .post(`/dashboard/tables/${mockTableId}/rows`)
        .set('Authorization', 'Bearer test-token')
        .send({
          tableId: mockTableId,
          data: { name: 'Item', value: 100 },
        })
        .expect(201);

      // List rows
      await request(app.getHttpServer())
        .get(`/dashboard/tables/${mockTableId}/rows`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Update row
      await request(app.getHttpServer())
        .put(`/dashboard/tables/rows/${mockRowId}`)
        .set('Authorization', 'Bearer test-token')
        .send({
          data: { name: 'Updated Item', value: 200 },
        })
        .expect(200);

      // Delete row
      await request(app.getHttpServer())
        .delete(`/dashboard/tables/rows/${mockRowId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Delete table
      await request(app.getHttpServer())
        .delete(`/dashboard/tables/${mockTableId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    });
  });
});
