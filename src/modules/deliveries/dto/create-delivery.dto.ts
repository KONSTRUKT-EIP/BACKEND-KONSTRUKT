import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'UUID de la ressource', format: 'uuid' })
  @IsUUID()
  resourceId: string;

  @ApiPropertyOptional({
    description: 'UUID du chantier. Si absent, utilise le site de la ressource',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({ example: '2026-09-01', description: 'Date prevue (ISO date)' })
  @IsISO8601({ strict: false })
  expectedDate: string;

  @ApiPropertyOptional({
    example: '2026-09-04',
    description: 'Date de reception (ISO date)',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  receivedDate?: string;

  @ApiProperty({ example: 35.5, description: 'Quantite livree/attendue (> 0)' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    description: 'Statut initial (defaut PLANIFIEE)',
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiPropertyOptional({
    example: 'Acier SA',
    description: 'Fournisseur (defaut ressource)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  supplier?: string;
}
