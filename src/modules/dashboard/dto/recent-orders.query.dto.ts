import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const RecentOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export class RecentOrdersQueryDto {
  @ApiProperty({
    required: false,
    example: 1,
    description: 'Page number (default: 1)',
  })
  page?: number = 1;

  @ApiProperty({
    required: false,
    example: 10,
    description: 'Items per page (default: 10, max: 100)',
  })
  pageSize?: number = 10;

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
