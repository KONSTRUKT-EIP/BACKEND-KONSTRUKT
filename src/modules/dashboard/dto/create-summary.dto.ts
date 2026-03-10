import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CreateSummarySchema = z.object({
  siteId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export type CreateSummaryInput = z.infer<typeof CreateSummarySchema>;

export class CreateSummaryDto {
  @ApiProperty({
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Site UUID — if omitted, the first available site is used',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

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
