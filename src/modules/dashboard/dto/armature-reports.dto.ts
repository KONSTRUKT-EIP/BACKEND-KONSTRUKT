import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const ArmatureReportsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  categories: z.string().optional(),
});

export class ArmatureReportsQueryDto {
  @ApiProperty({
    required: false,
    example: '2024-01-01',
    description: 'Start date in YYYY-MM-DD format',
  })
  startDate?: string;

  @ApiProperty({
    required: false,
    example: '2024-12-31',
    description: 'End date in YYYY-MM-DD format',
  })
  endDate?: string;

  @ApiProperty({
    required: false,
    example: 'voiles,planchers,poutres',
    description: 'Comma-separated list of categories to filter',
  })
  categories?: string;
}

export class KpiCardDataDto {
  @ApiProperty({ description: 'Label for the KPI', example: 'Voiles' })
  label: string;

  @ApiProperty({ description: 'Percentage progress', example: 75 })
  percentage: number;

  @ApiProperty({ description: 'Amount spent', example: 45000 })
  spent: number;
}

export class ChartDataPointDto {
  @ApiProperty({ description: 'Time label', example: '2024-01' })
  time: string;

  @ApiProperty({ description: 'Voiles value', example: 1200 })
  voiles: number;

  @ApiProperty({ description: 'Planchers value', example: 800 })
  planchers: number;

  @ApiProperty({ description: 'Poutres value', example: 500, required: false })
  poutres?: number;

  @ApiProperty({
    description: 'Superstructure value',
    example: 300,
    required: false,
  })
  superstructure?: number;
}

export class FilterDto {
  @ApiProperty({ description: 'Filter ID', example: 'voiles' })
  id: string;

  @ApiProperty({ description: 'Filter label', example: 'Voiles' })
  label: string;
}

export class DonutDataPointDto {
  @ApiProperty({ description: 'Category name', example: 'Voiles' })
  name: string;

  @ApiProperty({ description: 'Value for the category', example: 45000 })
  value: number;
}

export class AnalyticsDonutDto {
  @ApiProperty({ type: [DonutDataPointDto] })
  data: DonutDataPointDto[];
}
export class ArmatureReportsResponseDto {
  @ApiProperty({ type: [KpiCardDataDto], description: 'KPI cards data' })
  kpiCards: KpiCardDataDto[];

  @ApiProperty({
    type: [ChartDataPointDto],
    description: 'Time series chart data',
  })
  chartData: ChartDataPointDto[];

  @ApiProperty({ type: [FilterDto], description: 'Available filters' })
  filters: FilterDto[];

  @ApiProperty({
    type: AnalyticsDonutDto,
    description: 'Donut chart analytics',
  })
  donutChart: AnalyticsDonutDto;

  @ApiProperty({ description: 'Total budget', example: 250000 })
  totalBudget: number;

  @ApiProperty({ description: 'Total spent', example: 185000 })
  totalSpent: number;

  @ApiProperty({ description: 'Overall percentage', example: 74 })
  overallPercentage: number;
}
