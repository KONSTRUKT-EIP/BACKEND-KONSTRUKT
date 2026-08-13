import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DashboardSummaryQuerySchema = z.object({
  startDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export class DashboardSummaryQueryDto {
  @ApiProperty({
    required: false,
    example: '2024-01-01',
    description: 'Start date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  startDate?: string;

  @ApiProperty({
    required: false,
    example: '2024-12-31',
    description: 'End date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string;
}

export class CategoryKpiDto {
  @ApiProperty()
  id: number;

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
