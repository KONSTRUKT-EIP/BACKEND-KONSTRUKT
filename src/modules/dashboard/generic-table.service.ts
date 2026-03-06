import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateGenericTableDto } from './dto/create-generic-table.dto';
import { UpdateGenericTableDto } from './dto/update-generic-table.dto';
import { CreateGenericTableRowDto } from './dto/create-generic-table-row.dto';
import { UpdateGenericTableRowDto } from './dto/update-generic-table-row.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GenericTableService {
  constructor(private readonly prisma: PrismaService) {}

  async createTable(dto: CreateGenericTableDto) {
    return await this.prisma.genericTable.create({ data: dto });
  }

  async getTable(id: string) {
    const table = await this.prisma.genericTable.findUnique({
      where: { id },
      include: { rows: true },
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    return table;
  }

  async updateTable(id: string, dto: UpdateGenericTableDto) {
    try {
      return await this.prisma.genericTable.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Table with ID ${id} not found`);
      }
      throw error;
    }
  }

  async deleteTable(id: string) {
    try {
      return await this.prisma.genericTable.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Table with ID ${id} not found`);
      }
      throw error;
    }
  }

  async listTables(siteId?: string) {
    return await this.prisma.genericTable.findMany({
      where: siteId ? { siteId } : {},
      include: { rows: true },
    });
  }

  async addRow(dto: CreateGenericTableRowDto) {
    try {
      return await this.prisma.genericTableRow.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
      }
      throw error;
    }
  }

  async updateRow(id: string, dto: UpdateGenericTableRowDto) {
    try {
      return await this.prisma.genericTableRow.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Row with ID ${id} not found`);
      }
      throw error;
    }
  }

  async deleteRow(id: string) {
    try {
      return await this.prisma.genericTableRow.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Row with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getRow(id: string) {
    const row = await this.prisma.genericTableRow.findUnique({ where: { id } });

    if (!row) {
      throw new NotFoundException(`Row with ID ${id} not found`);
    }

    return row;
  }

  async listRows(tableId: string) {
    const table = await this.prisma.genericTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${tableId} not found`);
    }

    return await this.prisma.genericTableRow.findMany({ where: { tableId } });
  }
}
