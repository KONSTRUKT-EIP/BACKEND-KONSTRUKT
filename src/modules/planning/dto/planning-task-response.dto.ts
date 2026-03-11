import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PlanningTaskStatus =
  | 'done'
  | 'weather-risk'
  | 'late'
  | 'in-progress';

export class PlanningTaskResponseDto {
  @ApiProperty({
    example: '8c7b6a59-4d3e-4f21-0987-654321fedcba',
    description: 'ID de la tâche',
  })
  id: string;

  @ApiProperty({
    example: 'Coulage dalle',
    description: 'Nom de la tâche',
  })
  label: string;

  @ApiProperty({
    example: '2026-03-10',
    description: 'Date de la tâche (format ISO)',
  })
  date: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Heure de début (optionnelle)',
  })
  time?: string;

  @ApiProperty({
    enum: ['done', 'weather-risk', 'late', 'in-progress'],
    example: 'in-progress',
    description: 'Statut de la tâche pour le frontend',
  })
  status: PlanningTaskStatus;
}
