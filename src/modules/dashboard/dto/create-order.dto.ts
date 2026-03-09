import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000010',
    description: 'Resource UUID',
  })
  @IsUUID('4')
  resourceId: string;

  @ApiProperty({ example: 10, description: 'Quantity to order (min 1)' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000003',
    description: 'Site UUID',
  })
  @IsUUID('4')
  siteId: string;

  @ApiProperty({
    example: '2026-04-15',
    description: 'Expected delivery date (YYYY-MM-DD)',
  })
  @IsDateString()
  expectedDate: string;

  @ApiProperty({ example: 'Acier SA', description: 'Supplier name' })
  @IsString()
  @IsNotEmpty()
  supplier: string;
}
