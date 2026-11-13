import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSiteZoneDto {
  @ApiProperty({ example: 'Batiment A' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'R+1', description: 'Niveau ou etage de la zone' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
