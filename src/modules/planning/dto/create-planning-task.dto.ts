import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { TaskType } from '@prisma/client';

export class CreatePlanningTaskDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    description: 'ID de la zone du chantier',
  })
  @IsUUID('all')
  @IsNotEmpty()
  siteZoneId: string;

  @ApiProperty({
    example: 'f1e2d3c4-b5a6-4798-8901-234567890abc',
    description: "ID de l'utilisateur assigné",
  })
  @IsUUID('all')
  @IsNotEmpty()
  assignedToId: string;

  @ApiProperty({
    example: 'Coulage dalle',
    description: 'Nom de la tâche',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Coulage de la dalle du secteur A',
    description: 'Description détaillée de la tâche',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: TaskType,
    example: TaskType.GROS_OEUVRE,
    description: 'Type de tâche',
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({
    example: 1,
    description: 'Priorité de la tâche (1 = haute, 5 = basse)',
  })
  @IsNotEmpty()
  priority: number;

  @ApiProperty({
    example: '2026-03-15T17:00:00Z',
    description: 'Date de fin prévue',
  })
  @IsDateString()
  @IsNotEmpty()
  plannedEnd: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Heure de début (optionnelle)',
  })
  @IsString()
  @IsOptional()
  time?: string;
}
