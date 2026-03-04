import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const DashboardSummaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export class DashboardSummaryQueryDto {
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
}

export class CategoryKpiDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  spent: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty()
  globalProgress: number;

  @ApiProperty()
  globalSpent: number;

  @ApiProperty({ type: [CategoryKpiDto] })
  categories: CategoryKpiDto[];
}
