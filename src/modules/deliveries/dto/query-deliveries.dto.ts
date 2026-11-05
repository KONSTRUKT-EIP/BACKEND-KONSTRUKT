import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryDeliveriesDto {
  @ApiPropertyOptional({
    description: 'Filtrer par chantier (siteId)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    description: 'Filtrer par statut',
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['createdAt', 'expectedDate', 'receivedDate'],
    description: 'Champ date utilise pour les filtres startDate/endDate',
  })
  @IsOptional()
  @IsIn(['createdAt', 'expectedDate', 'receivedDate'])
  dateField?: 'createdAt' | 'expectedDate' | 'receivedDate' = 'createdAt';

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Date debut (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Date fin (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page (defaut: 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Taille de page (defaut: 20, max: 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
