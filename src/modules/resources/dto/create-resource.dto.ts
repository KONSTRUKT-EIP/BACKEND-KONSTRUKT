import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({ format: 'uuid', description: 'UUID du chantier' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: 'Armature 12mm' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 1200.5, description: 'Quantite disponible' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 3.4, description: 'Prix unitaire' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 'Acier SA' })
  @IsString()
  @IsNotEmpty()
  supplier: string;
}
