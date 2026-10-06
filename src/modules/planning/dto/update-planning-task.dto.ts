import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { TaskType, TaskStatus } from '@prisma/client';

export class UpdatePlanningTaskDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    description: 'ID de la zone du chantier',
  })
  @IsUUID('all')
  @IsOptional()
  siteZoneId?: string;

  @ApiPropertyOptional({
    example: [
      'f1e2d3c4-b5a6-4798-8901-234567890abc',
      'a2b3c4d5-e6f7-4859-9abc-def123456789',
    ],
    description: 'IDs des utilisateurs assignés (au moins 1)',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  assignedToIds?: string[];

  @ApiPropertyOptional({
    example: 'Coulage dalle',
    description: 'Nom de la tâche',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Coulage de la dalle du secteur A',
    description: 'Description détaillée de la tâche',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: TaskType,
    example: TaskType.GROS_OEUVRE,
    description: 'Type de tâche',
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Priorité de la tâche (1 = haute, 5 = basse)',
  })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    example: '2026-03-15T17:00:00Z',
    description: 'Date de fin prévue',
  })
  @IsDateString()
  @IsOptional()
  plannedEnd?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.EN_COURS,
    description: 'Statut de la tâche',
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    example: '2026-03-10T08:00:00Z',
    description: 'Date de début réelle',
  })
  @IsDateString()
  @IsOptional()
  realStart?: string;

  @ApiPropertyOptional({
    example: '2026-03-10T17:00:00Z',
    description: 'Date de fin réelle',
  })
  @IsDateString()
  @IsOptional()
  realEnd?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Heure de début (optionnelle)',
  })
  @IsString()
  @IsOptional()
  time?: string;
}
