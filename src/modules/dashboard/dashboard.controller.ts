import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import {
  DashboardSummaryQueryDto,
  DashboardSummaryResponseDto,
  DashboardSummaryQuerySchema,
} from './dto/dashboard-summary.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard/armature')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
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
}
