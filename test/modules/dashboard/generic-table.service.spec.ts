import { Test, TestingModule } from '@nestjs/testing';
import { GenericTableService } from '../../../src/modules/dashboard/generic-table.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { CreateGenericTableDto } from '../../../src/modules/dashboard/dto/create-generic-table.dto';
import { UpdateGenericTableDto } from '../../../src/modules/dashboard/dto/update-generic-table.dto';
import { CreateGenericTableRowDto } from '../../../src/modules/dashboard/dto/create-generic-table-row.dto';
import { UpdateGenericTableRowDto } from '../../../src/modules/dashboard/dto/update-generic-table-row.dto';

describe('GenericTableService', () => {
  let service: GenericTableService;
  let prisma: PrismaService;

  const mockTable = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Table',
    columns: { col1: 'string', col2: 'number' },
    siteId: '550e8400-e29b-41d4-a716-446655440001',
    createdAt: new Date(),
    updatedAt: new Date(),
    rows: [],
  };

  const mockRow = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    tableId: '550e8400-e29b-41d4-a716-446655440000',
    data: { col1: 'value1', col2: 42 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericTableService,
        {
          provide: PrismaService,
          useValue: {
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
          },
        },
      ],
    }).compile();

    service = module.get<GenericTableService>(GenericTableService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const dto: CreateGenericTableDto = {
        name: 'Test Table',
        columns: { col1: 'string', col2: 'number' },
        siteId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = await service.createTable(dto);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('getTable', () => {
    it('should return a table with rows', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await service.getTable(tableId);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
        include: { rows: true },
      });
    });
  });

  describe('updateTable', () => {
    it('should update a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';
      const dto: UpdateGenericTableDto = {
        name: 'Updated Table',
      };

      const result = await service.updateTable(tableId, dto);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.update).toHaveBeenCalledWith({
        where: { id: tableId },
        data: dto,
      });
    });
  });

  describe('deleteTable', () => {
    it('should delete a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await service.deleteTable(tableId);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.delete).toHaveBeenCalledWith({
        where: { id: tableId },
      });
    });
  });

  describe('listTables', () => {
    it('should list all tables without filter', async () => {
      const result = await service.listTables();

      expect(result).toEqual([mockTable]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalledWith({
        where: {},
        include: { rows: true },
      });
    });

    it('should list tables filtered by siteId', async () => {
      const siteId = '550e8400-e29b-41d4-a716-446655440001';

      const result = await service.listTables(siteId);

      expect(result).toEqual([mockTable]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTable.findMany).toHaveBeenCalledWith({
        where: { siteId },
        include: { rows: true },
      });
    });
  });

  describe('addRow', () => {
    it('should add a row to a table', async () => {
      const dto: CreateGenericTableRowDto = {
        tableId: '550e8400-e29b-41d4-a716-446655440000',
        data: { col1: 'value1', col2: 42 },
      };

      const result = await service.addRow(dto);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('updateRow', () => {
    it('should update a row', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';
      const dto: UpdateGenericTableRowDto = {
        data: { col1: 'updated', col2: 100 },
      };

      const result = await service.updateRow(rowId, dto);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.update).toHaveBeenCalledWith({
        where: { id: rowId },
        data: dto,
      });
    });
  });

  describe('deleteRow', () => {
    it('should delete a row', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';

      const result = await service.deleteRow(rowId);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.delete).toHaveBeenCalledWith({
        where: { id: rowId },
      });
    });
  });

  describe('getRow', () => {
    it('should return a row by ID', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';

      const result = await service.getRow(rowId);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.findUnique).toHaveBeenCalledWith({
        where: { id: rowId },
      });
    });
  });

  describe('listRows', () => {
    it('should list all rows in a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await service.listRows(tableId);

      expect(result).toEqual([mockRow]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.genericTableRow.findMany).toHaveBeenCalledWith({
        where: { tableId },
      });
    });
  });
});
