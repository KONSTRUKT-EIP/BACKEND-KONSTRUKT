import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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
    example: '00000000-0000-0000-0000-000000000001',
    description: "ID de l'organisation",
  })
  @IsUUID('4')
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
