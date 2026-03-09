import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
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
