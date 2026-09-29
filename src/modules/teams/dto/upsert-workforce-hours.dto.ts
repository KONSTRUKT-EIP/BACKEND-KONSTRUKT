import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpsertWorkforceHoursDto {
  @ApiProperty({
    description: 'UUID de l’équipe (facultatif, résolu depuis le chantier)',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  teamId?: string;

  @ApiProperty({ description: 'UUID du membre', format: 'uuid' })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  userId!: string;

  @ApiProperty({ example: '2026-09-29', description: 'Date travaillée' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 7.5, minimum: 0, maximum: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(24)
  normalHours!: number;

  @ApiProperty({ example: 1.5, minimum: 0, maximum: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(24)
  overtimeHours!: number;
}
