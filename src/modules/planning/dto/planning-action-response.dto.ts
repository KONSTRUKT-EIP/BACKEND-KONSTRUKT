import { ApiProperty } from '@nestjs/swagger';

export type ActionBadge = 'En retard' | 'À décaler' | 'À risque';

export class PlanningActionResponseDto {
  @ApiProperty({
    example: '3e4d5c6b-7a89-4012-3456-789abcdef012',
    description: "ID de l'action",
  })
  id: string;

  @ApiProperty({
    example: '⏰',
    description: "Icône de l'action",
  })
  icon: string;

  @ApiProperty({
    example: 'bg-red-50',
    description: "Couleur de fond de l'icône",
  })
  iconBg: string;

  @ApiProperty({
    example: 'Coulage dalle',
    description: "Label de l'action",
  })
  label: string;

  @ApiProperty({
    example: 'Secteur A',
    description: "Sous-label de l'action",
  })
  sublabel: string;

  @ApiProperty({
    example: '📍',
    description: 'Icône du sous-label',
  })
  sublabelIcon: string;

  @ApiProperty({
    enum: ['En retard', 'À décaler', 'À risque'],
    example: 'En retard',
    description: "Badge de l'action",
  })
  badge: ActionBadge;
}
