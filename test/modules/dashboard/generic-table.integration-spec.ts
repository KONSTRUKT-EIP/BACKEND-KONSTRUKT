import { Test, TestingModule } from '@nestjs/testing';
import { GenericTableService } from '../../../src/modules/dashboard/generic-table.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { CreateGenericTableDto } from '../../../src/modules/dashboard/dto/create-generic-table.dto';
import { CreateGenericTableRowDto } from '../../../src/modules/dashboard/dto/create-generic-table-row.dto';

describe('GenericTableService Integration', () => {
  let service: GenericTableService;
  let prisma: PrismaService;

  const mockSiteId = '550e8400-e29b-41d4-a716-446655440001';

  beforeAll(async () => {
    const mockPrismaService = {
      genericTable: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      genericTableRow: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericTableService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GenericTableService>(GenericTableService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Complete workflow: create table and manage rows', () => {
    it('should create a table, add rows, and retrieve them', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';
      const rowId1 = '550e8400-e29b-41d4-a716-446655440002';
      const rowId2 = '550e8400-e29b-41d4-a716-446655440003';

      const tableDto: CreateGenericTableDto = {
        name: 'Integration Test Table',
        columns: { name: 'string', quantity: 'number', price: 'number' },
        siteId: mockSiteId,
      };

      const mockTable = {
        id: tableId,
        ...tableDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        rows: [],
      };

      (prisma.genericTable.create as jest.Mock).mockResolvedValue(mockTable);

      const createdTable = await service.createTable(tableDto);
      expect(createdTable).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.create).toHaveBeenCalledWith({
        data: tableDto,
      });

      const row1Dto: CreateGenericTableRowDto = {
        tableId,
        data: { name: 'Item 1', quantity: 10, price: 99.99 },
      };

      const mockRow1 = {
        id: rowId1,
        ...row1Dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTableRow.create as jest.Mock).mockResolvedValue(mockRow1);

      const row1 = await service.addRow(row1Dto);
      expect(row1).toEqual(mockRow1);

      const row2Dto: CreateGenericTableRowDto = {
        tableId,
        data: { name: 'Item 2', quantity: 5, price: 149.99 },
      };

      const mockRow2 = {
        id: rowId2,
        ...row2Dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTableRow.create as jest.Mock).mockResolvedValue(mockRow2);

      const row2 = await service.addRow(row2Dto);
      expect(row2).toEqual(mockRow2);

      (prisma.genericTableRow.findMany as jest.Mock).mockResolvedValue([
        mockRow1,
        mockRow2,
      ]);

      const allRows = await service.listRows(tableId);
      expect(allRows).toHaveLength(2);
      expect(allRows).toEqual(expect.arrayContaining([mockRow1, mockRow2]));

      const mockTableWithRows = {
        ...mockTable,
        rows: [mockRow1, mockRow2],
      };

      (prisma.genericTable.findUnique as jest.Mock).mockResolvedValue(
        mockTableWithRows,
      );

      const tableWithRows = await service.getTable(tableId);
      expect(tableWithRows.rows).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
        include: { rows: true },
      });
    });
  });

  describe('Filtering tables by site', () => {
    it('should filter tables by siteId', async () => {
      const siteId = mockSiteId;

      const tablesForSite = [
        {
          id: '1',
          name: 'Table 1',
          columns: {},
          siteId,
          createdAt: new Date(),
          updatedAt: new Date(),
          rows: [],
        },
        {
          id: '2',
          name: 'Table 2',
          columns: {},
          siteId,
          createdAt: new Date(),
          updatedAt: new Date(),
          rows: [],
        },
      ];

      (prisma.genericTable.findMany as jest.Mock).mockResolvedValue(
        tablesForSite,
      );

      const result = await service.listTables(siteId);

      expect(result).toHaveLength(2);
      expect(result.every((table) => table.siteId === siteId)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalledWith({
        where: { siteId },
        include: { rows: true },
      });
    });

    it('should return all tables when no siteId is provided', async () => {
      const allTables = [
        {
          id: '1',
          name: 'Table 1',
          columns: {},
          siteId: mockSiteId,
          createdAt: new Date(),
          updatedAt: new Date(),
          rows: [],
        },
        {
          id: '2',
          name: 'Table 2',
          columns: {},
          siteId: '550e8400-e29b-41d4-a716-446655440099',
          createdAt: new Date(),
          updatedAt: new Date(),
          rows: [],
        },
      ];

      (prisma.genericTable.findMany as jest.Mock).mockResolvedValue(allTables);

      const result = await service.listTables();

      expect(result).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalledWith({
        where: {},
        include: { rows: true },
      });
    });
  });

  describe('Update operations', () => {
    it('should update table name and columns', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';
      const updateDto = {
        name: 'Updated Table Name',
        columns: { newCol: 'boolean' },
      };

      const updatedTable = {
        id: tableId,
        ...updateDto,
        siteId: mockSiteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTable.update as jest.Mock).mockResolvedValue(updatedTable);

      const result = await service.updateTable(tableId, updateDto);

      expect(result.name).toBe('Updated Table Name');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.update).toHaveBeenCalledWith({
        where: { id: tableId },
        data: updateDto,
      });
    });

    it('should update row data', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';
      const updateDto = {
        data: { name: 'Updated Item', quantity: 20, price: 199.99 },
      };

      const updatedRow = {
        id: rowId,
        tableId: '550e8400-e29b-41d4-a716-446655440000',
        ...updateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTableRow.update as jest.Mock).mockResolvedValue(
        updatedRow,
      );

      const result = await service.updateRow(rowId, updateDto);

      expect(result.data).toEqual(updateDto.data);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.update).toHaveBeenCalledWith({
        where: { id: rowId },
        data: updateDto,
      });
    });
  });

  describe('Delete operations', () => {
    it('should delete a row', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';

      const deletedRow = {
        id: rowId,
        tableId: '550e8400-e29b-41d4-a716-446655440000',
        data: { name: 'Item 1', quantity: 10, price: 99.99 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTableRow.delete as jest.Mock).mockResolvedValue(
        deletedRow,
      );

      const result = await service.deleteRow(rowId);

      expect(result.id).toBe(rowId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.delete).toHaveBeenCalledWith({
        where: { id: rowId },
      });
    });

    it('should delete a table and cascade delete its rows', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const deletedTable = {
        id: tableId,
        name: 'Table to Delete',
        columns: {},
        siteId: mockSiteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.genericTable.delete as jest.Mock).mockResolvedValue(deletedTable);

      const result = await service.deleteTable(tableId);

      expect(result.id).toBe(tableId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.delete).toHaveBeenCalledWith({
        where: { id: tableId },
      });
    });
  });
});
