import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateResourceUsageDto {
  @ApiProperty({ format: 'uuid', description: 'UUID ressource' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ format: 'uuid', description: 'UUID tache' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ format: 'uuid', description: 'UUID utilisateur createur' })
  @IsUUID()
  createdById: string;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Date de consommation (ISO date)',
  })
  @IsISO8601({ strict: false })
  date: string;

  @ApiProperty({ example: 120, description: 'Quantite consommee (> 0)' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ example: 'Consommation pour coulage zone A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
