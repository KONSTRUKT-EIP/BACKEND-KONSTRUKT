import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSiteZoneDto {
  @ApiProperty({ example: 'Batiment A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'R+1', description: 'Niveau ou etage de la zone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  level: string;

  @ApiPropertyOptional({ example: 'Aile nord, cages d escalier comprises' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
