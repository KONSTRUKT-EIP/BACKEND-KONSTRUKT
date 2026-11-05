import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryResourcesDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtre chantier' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    enum: ResourceType,
    description: 'Filtre type de ressource',
  })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({ description: 'Filtre fournisseur exact' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page (defaut: 1)' })
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
