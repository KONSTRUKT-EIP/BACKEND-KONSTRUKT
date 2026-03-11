import { ApiProperty } from '@nestjs/swagger';
import { PlanningTaskResponseDto } from './planning-task-response.dto';
import { PlanningActionResponseDto } from './planning-action-response.dto';

export class WeekPlanningStatsDto {
  @ApiProperty({
    example: 14,
    description: 'Nombre de tâches cette semaine',
  })
  tasksThisWeek: number;

  @ApiProperty({
    example: 3,
    description: 'Nombre de tâches en retard',
  })
  tasksLate: number;

  @ApiProperty({
    example: 2,
    description: 'Nombre de tâches à risque météo',
  })
  tasksWeatherRisk: number;
}

export class WeekPlanningResponseDto {
  @ApiProperty({
    type: [PlanningTaskResponseDto],
    description: 'Liste des tâches de la semaine',
  })
  tasks: PlanningTaskResponseDto[];

  @ApiProperty({
    type: [PlanningActionResponseDto],
    description: 'Liste des actions requises',
  })
  actions: PlanningActionResponseDto[];

  @ApiProperty({
    type: WeekPlanningStatsDto,
    description: 'Statistiques de la semaine',
  })
  stats: WeekPlanningStatsDto;
}
