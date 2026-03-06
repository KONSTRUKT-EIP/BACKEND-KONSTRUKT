import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GenericTableService } from './generic-table.service';
import { CreateGenericTableDto } from './dto/create-generic-table.dto';
import { UpdateGenericTableDto } from './dto/update-generic-table.dto';
import { AddGenericTableRowDto } from './dto/add-generic-table-row.dto';
import { UpdateGenericTableRowDto } from './dto/update-generic-table-row.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';

@ApiTags('Dashboard - Generic Tables')
@ApiBearerAuth()
@Controller('dashboard/tables')
export class GenericTableController {
  constructor(private readonly service: GenericTableService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Create a new generic table' })
  @ApiResponse({ status: 201, description: 'Table created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  createTable(@Body() dto: CreateGenericTableDto) {
    return this.service.createTable(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Get a table by ID' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table found.' })
  @ApiResponse({ status: 404, description: 'Table not found.' })
  getTable(@Param('id') id: string) {
    return this.service.getTable(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Update a table' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Table not found.' })
  updateTable(@Param('id') id: string, @Body() dto: UpdateGenericTableDto) {
    return this.service.updateTable(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Delete a table' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Table not found.' })
  deleteTable(@Param('id') id: string) {
    return this.service.deleteTable(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'List all tables' })
  @ApiQuery({
    name: 'siteId',
    required: false,
    description: 'Filter by site UUID',
  })
  @ApiResponse({ status: 200, description: 'List of tables.' })
  listTables(@Query('siteId') siteId?: string) {
    return this.service.listTables(siteId);
  }

  @Post(':tableId/rows')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Add a row to a table' })
  @ApiParam({ name: 'tableId', description: 'Table UUID' })
  @ApiResponse({ status: 201, description: 'Row added successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Table not found.' })
  addRow(
    @Param('tableId') tableId: string,
    @Body() dto: AddGenericTableRowDto,
  ) {
    return this.service.addRow({ tableId, data: dto.data });
  }

  @Get(':tableId/rows')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'List all rows in a table' })
  @ApiParam({ name: 'tableId', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'List of rows.' })
  @ApiResponse({ status: 404, description: 'Table not found.' })
  listRows(@Param('tableId') tableId: string) {
    return this.service.listRows(tableId);
  }

  @Get('rows/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Get a row by ID' })
  @ApiParam({ name: 'id', description: 'Row UUID' })
  @ApiResponse({ status: 200, description: 'Row found.' })
  @ApiResponse({ status: 404, description: 'Row not found.' })
  getRow(@Param('id') id: string) {
    return this.service.getRow(id);
  }

  @Put('rows/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Update a row' })
  @ApiParam({ name: 'id', description: 'Row UUID' })
  @ApiResponse({ status: 200, description: 'Row updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Row not found.' })
  updateRow(@Param('id') id: string, @Body() dto: UpdateGenericTableRowDto) {
    return this.service.updateRow(id, dto);
  }

  @Delete('rows/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Delete a row' })
  @ApiParam({ name: 'id', description: 'Row UUID' })
  @ApiResponse({ status: 200, description: 'Row deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Row not found.' })
  deleteRow(@Param('id') id: string) {
    return this.service.deleteRow(id);
  }
}
