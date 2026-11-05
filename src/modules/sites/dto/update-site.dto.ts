import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SiteStatus } from './create-site.dto';

export class UpdateSiteDto {
  @ApiPropertyOptional({ example: 'Chantier Lyon Centre' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '5 place Bellecour' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Lyon' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '69001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SiteStatus })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: string;

  @ApiPropertyOptional({ example: 750000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}
