import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateGenericTableDto } from './dto/create-generic-table.dto';
import { UpdateGenericTableDto } from './dto/update-generic-table.dto';
import { CreateGenericTableRowDto } from './dto/create-generic-table-row.dto';
import { UpdateGenericTableRowDto } from './dto/update-generic-table-row.dto';

@Injectable()
export class GenericTableService {
  constructor(private readonly prisma: PrismaService) {}

  async createTable(dto: CreateGenericTableDto) {
    return await this.prisma.genericTable.create({ data: dto });
  }

  async getTable(id: string) {
    return await this.prisma.genericTable.findUnique({
      where: { id },
      include: { rows: true },
    });
  }

  async updateTable(id: string, dto: UpdateGenericTableDto) {
    return await this.prisma.genericTable.update({ where: { id }, data: dto });
  }

  async deleteTable(id: string) {
    return await this.prisma.genericTable.delete({ where: { id } });
  }

  async listTables(siteId?: string) {
    return await this.prisma.genericTable.findMany({
      where: siteId ? { siteId } : {},
      include: { rows: true },
    });
  }

  async addRow(dto: CreateGenericTableRowDto) {
    return await this.prisma.genericTableRow.create({ data: dto });
  }

  async updateRow(id: string, dto: UpdateGenericTableRowDto) {
    return await this.prisma.genericTableRow.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRow(id: string) {
    return await this.prisma.genericTableRow.delete({ where: { id } });
  }

  async getRow(id: string) {
    return await this.prisma.genericTableRow.findUnique({ where: { id } });
  }

  async listRows(tableId: string) {
    return await this.prisma.genericTableRow.findMany({ where: { tableId } });
  }
}
