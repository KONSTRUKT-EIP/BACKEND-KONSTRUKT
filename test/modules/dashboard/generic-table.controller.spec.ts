import { Test, TestingModule } from '@nestjs/testing';
import { GenericTableController } from '../../../src/modules/dashboard/generic-table.controller';
import { GenericTableService } from '../../../src/modules/dashboard/generic-table.service';
import { CreateGenericTableDto } from '../../../src/modules/dashboard/dto/create-generic-table.dto';
import { UpdateGenericTableDto } from '../../../src/modules/dashboard/dto/update-generic-table.dto';
import { CreateGenericTableRowDto } from '../../../src/modules/dashboard/dto/create-generic-table-row.dto';
import { UpdateGenericTableRowDto } from '../../../src/modules/dashboard/dto/update-generic-table-row.dto';

describe('GenericTableController', () => {
  let controller: GenericTableController;
  let service: GenericTableService;

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
      controllers: [GenericTableController],
      providers: [
        {
          provide: GenericTableService,
          useValue: {
            createTable: jest.fn().mockResolvedValue(mockTable),
            getTable: jest.fn().mockResolvedValue(mockTable),
            updateTable: jest.fn().mockResolvedValue(mockTable),
            deleteTable: jest.fn().mockResolvedValue(mockTable),
            listTables: jest.fn().mockResolvedValue([mockTable]),
            addRow: jest.fn().mockResolvedValue(mockRow),
            listRows: jest.fn().mockResolvedValue([mockRow]),
            getRow: jest.fn().mockResolvedValue(mockRow),
            updateRow: jest.fn().mockResolvedValue(mockRow),
            deleteRow: jest.fn().mockResolvedValue(mockRow),
          },
        },
      ],
    }).compile();

    controller = module.get<GenericTableController>(GenericTableController);
    service = module.get<GenericTableService>(GenericTableService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const dto: CreateGenericTableDto = {
        name: 'Test Table',
        columns: { col1: 'string', col2: 'number' },
        siteId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = await controller.createTable(dto);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createTable).toHaveBeenCalledWith(dto);
    });
  });

  describe('getTable', () => {
    it('should return a table by ID', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await controller.getTable(tableId);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getTable).toHaveBeenCalledWith(tableId);
    });
  });

  describe('updateTable', () => {
    it('should update a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';
      const dto: UpdateGenericTableDto = {
        name: 'Updated Table',
      };

      const result = await controller.updateTable(tableId, dto);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.updateTable).toHaveBeenCalledWith(tableId, dto);
    });
  });

  describe('deleteTable', () => {
    it('should delete a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await controller.deleteTable(tableId);

      expect(result).toEqual(mockTable);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.deleteTable).toHaveBeenCalledWith(tableId);
    });
  });

  describe('listTables', () => {
    it('should list all tables without filter', async () => {
      const result = await controller.listTables();

      expect(result).toEqual([mockTable]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listTables).toHaveBeenCalledWith(undefined);
    });

    it('should list tables filtered by siteId', async () => {
      const siteId = '550e8400-e29b-41d4-a716-446655440001';

      const result = await controller.listTables(siteId);

      expect(result).toEqual([mockTable]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listTables).toHaveBeenCalledWith(siteId);
    });
  });

  describe('addRow', () => {
    it('should add a row to a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';
      const dto: CreateGenericTableRowDto = {
        tableId,
        data: { col1: 'value1', col2: 42 },
      };

      const result = await controller.addRow(tableId, dto);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.addRow).toHaveBeenCalledWith(dto);
    });
  });

  describe('listRows', () => {
    it('should list all rows in a table', async () => {
      const tableId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await controller.listRows(tableId);

      expect(result).toEqual([mockRow]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listRows).toHaveBeenCalledWith(tableId);
    });
  });

  describe('getRow', () => {
    it('should return a row by ID', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';

      const result = await controller.getRow(rowId);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getRow).toHaveBeenCalledWith(rowId);
    });
  });

  describe('updateRow', () => {
    it('should update a row', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';
      const dto: UpdateGenericTableRowDto = {
        data: { col1: 'updated', col2: 100 },
      };

      const result = await controller.updateRow(rowId, dto);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.updateRow).toHaveBeenCalledWith(rowId, dto);
    });
  });

  describe('deleteRow', () => {
    it('should delete a row', async () => {
      const rowId = '550e8400-e29b-41d4-a716-446655440002';

      const result = await controller.deleteRow(rowId);

      expect(result).toEqual(mockRow);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.deleteRow).toHaveBeenCalledWith(rowId);
    });
  });
});
