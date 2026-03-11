import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PlanningTaskStatus =
  | 'done'
  | 'weather-risk'
  | 'late'
  | 'in-progress';

export class PlanningTaskResponseDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
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
