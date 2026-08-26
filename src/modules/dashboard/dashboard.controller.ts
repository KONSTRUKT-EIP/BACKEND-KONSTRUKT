import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DashboardSummaryQueryDto,
  DashboardSummaryResponseDto,
  DashboardSummaryQuerySchema,
} from './dto/dashboard-summary.dto';
import {
  CreateSummaryDto,
  CreateSummarySchema,
} from './dto/create-summary.dto';
import {
  ArmatureReportsQueryDto,
  ArmatureReportsResponseDto,
  ArmatureReportsQuerySchema,
} from './dto/armature-reports.dto';
import {
  RecentOrdersQueryDto,
  RecentOrdersQuerySchema,
} from './dto/recent-orders.query.dto';
import { RecentOrdersResponseDto } from './dto/recent-orders.dto';
import { CreateOrderDto, CreateOrderSchema } from './dto/create-order.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
@Controller('dashboard/armature')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary (KPIs + category progress)',
    description:
      'Returns the summary last set via POST /summary if one exists, ' +
      'otherwise computes it from database resources and usages.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, type: DashboardSummaryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getSummary(
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    const result = DashboardSummaryQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return this.dashboardService.getSummary(result.data);
  }

  @Post('summary')
  @ApiOperation({
    summary: 'Set dashboard summary values (overrides computed values)',
    description:
      'Directly set the globalProgress, globalSpent and per-category progress/spent values. ' +
      'Once set, GET /summary will return these stored values instead of computing from DB.',
  })
  @ApiBody({ type: CreateSummaryDto })
  @ApiResponse({ status: 201, type: DashboardSummaryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  createSummary(@Body() dto: CreateSummaryDto): DashboardSummaryResponseDto {
    const result = CreateSummarySchema.safeParse(dto);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return this.dashboardService.createSummary(result.data);
  }

  @Get('resources')
  @ApiOperation({
    summary: 'List all available resources (for order creation)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of resources',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          unit: { type: 'string' },
          unitPrice: { type: 'number' },
          supplier: { type: 'string' },
          siteId: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getResources() {
    return this.dashboardService.getResources();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get armature reports (KPI cards + chart + donut)' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'categories',
    required: false,
    type: String,
    example: 'voiles,planchers,poutres',
    description: 'Comma-separated list of categories to filter',
  })
  @ApiResponse({ status: 200, type: ArmatureReportsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getReports(
    @Query() query: ArmatureReportsQueryDto,
  ): Promise<ArmatureReportsResponseDto> {
    const result = ArmatureReportsQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return await this.dashboardService.getReports(result.data);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get armature analytics (same as reports, alias)' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'categories',
    required: false,
    type: String,
    example: 'voiles,planchers',
    description: 'Comma-separated list of categories to filter',
  })
  @ApiResponse({ status: 200, type: ArmatureReportsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getArmatureAnalytics(
    @Query() query: ArmatureReportsQueryDto,
  ): Promise<ArmatureReportsResponseDto> {
    const result = ArmatureReportsQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return await this.dashboardService.getArmatureAnalytics(result.data);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, type: RecentOrdersResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllOrders(): Promise<RecentOrdersResponseDto> {
    return this.dashboardService.getAllOrders();
  }

  @Get('orders/site/:siteId')
  @ApiOperation({ summary: 'Get orders for one site' })
  @ApiResponse({ status: 200, type: RecentOrdersResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid site UUID.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getOrdersBySite(
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
  ): Promise<RecentOrdersResponseDto> {
    return this.dashboardService.getAllOrders(siteId);
  }

  @Get('orders/recent')
  @ApiOperation({ summary: 'Get recent orders (paginated deliveries)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, type: RecentOrdersResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getRecentOrders(
    @Query() query: RecentOrdersQueryDto,
  ): Promise<RecentOrdersResponseDto> {
    const result = RecentOrdersQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return this.dashboardService.getRecentOrders(result.data);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new delivery order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, type: RecentOrdersResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createOrder(
    @Body() dto: CreateOrderDto,
  ): Promise<RecentOrdersResponseDto> {
    const result = CreateOrderSchema.safeParse(dto);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    return this.dashboardService.createOrder(result.data);
  }
}
