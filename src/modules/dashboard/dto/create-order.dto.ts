import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  siteId: z.string().uuid(),
  productName: z.string().min(1),
  productIcon: z.string().optional(),
  price: z.number().min(0),
  totalOrder: z.number().int().min(1),
  total: z.number().min(0),
});

export class CreateOrderDto {
  @ApiProperty({ description: 'UUID du chantier', format: 'uuid' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: 'Armature 12mm', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({
    example: 'https://cdn.konstrukt.com/icons/armature.png',
    description: 'Product icon URL (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  productIcon?: string;

  @ApiProperty({ example: 120, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 5, description: 'Quantity ordered (min 1)' })
  @IsNumber()
  @Min(1)
  totalOrder: number;

  @ApiProperty({ example: 600, description: 'Total price' })
  @IsNumber()
  @Min(0)
  total: number;
}
