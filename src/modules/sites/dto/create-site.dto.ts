import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export enum SiteStatus {
  PLANIFIE = 'PLANIFIE',
  EN_COURS = 'EN_COURS',
  SUSPENDU = 'SUSPENDU',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
}

export class CreateSiteDto {
  @ApiProperty({
    example: '9f8e7d6c-5b4a-3210-fedc-ba9876543210',
    description: "ID de l'organisation",
  })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'organizationId must be a valid UUID',
  })
  organizationId: string;

  @ApiProperty({ example: 'Chantier Paris 12', description: 'Nom du chantier' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '12 rue de la Paix', description: 'Adresse' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Paris', description: 'Ville' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '75012', description: 'Code postal' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Date de début (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Date de fin (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: SiteStatus, example: SiteStatus.EN_COURS })
  @IsEnum(SiteStatus)
  status: string;

  @ApiProperty({ example: 500000, description: 'Budget en euros' })
  @IsNumber()
  @Min(0)
  budget: number;
}
