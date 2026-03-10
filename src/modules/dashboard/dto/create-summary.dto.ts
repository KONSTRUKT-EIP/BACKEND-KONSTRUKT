import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { z } from 'zod';

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  progress: z.number().min(0).max(100),
  spent: z.number().min(0),
});

export const CreateSummarySchema = z.object({
  globalProgress: z.number().min(0).max(100),
  globalSpent: z.number().min(0),
  categories: z.array(CategorySchema),
});

export type CreateSummaryInput = z.infer<typeof CreateSummarySchema>;

export class CreateSummaryCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Voiles' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0, description: 'Progress percentage (0-100)' })
  @IsNumber()
  progress: number;

  @ApiProperty({ example: 0, description: 'Amount spent' })
  @IsNumber()
  spent: number;
}

export class CreateSummaryDto {
  @ApiProperty({
    example: 0,
    description: 'Global progress percentage (0-100)',
  })
  @IsNumber()
  globalProgress: number;

  @ApiProperty({ example: 0, description: 'Global amount spent' })
  @IsNumber()
  globalSpent: number;

  @ApiProperty({
    type: [CreateSummaryCategoryDto],
    description: 'Progress and spent amount per category',
    example: [
      { id: 1, name: 'Voiles', progress: 0, spent: 0 },
      { id: 2, name: 'Planchers', progress: 0, spent: 0 },
      { id: 3, name: 'Poutres', progress: 0, spent: 0 },
      { id: 4, name: 'Superstructure', progress: 0, spent: 0 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSummaryCategoryDto)
  categories: CreateSummaryCategoryDto[];
}
