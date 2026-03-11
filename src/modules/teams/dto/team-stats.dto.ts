import { ApiProperty } from '@nestjs/swagger';

export class TeamStatsDto {
  @ApiProperty({ description: 'Nombre total de travailleurs' })
  total: number;

  @ApiProperty({ description: 'Nombre de tâches complètes' })
  complete: number;

  @ApiProperty({ description: 'Nombre de tâches en cours' })
  enCours: number;

  @ApiProperty({ description: 'Nombre de tâches en attente' })
  enAttente: number;

  @ApiProperty({ description: 'Nombre de tâches annulées' })
  annule: number;

  @ApiProperty({ description: 'Pourcentage de présents' })
  pctPresents: number;

  @ApiProperty({ description: "Pourcentage d'absents" })
  pctAbsents: number;

  @ApiProperty({ description: 'Pourcentage de tâches complètes' })
  pctComplete: number;

  @ApiProperty({ description: 'Pourcentage de tâches en cours' })
  pctEnCours: number;
}

export class TeamMemberWithDetailsDto {
  @ApiProperty({ description: 'ID du membre' })
  id: string;

  @ApiProperty({ description: 'Spécialité du membre' })
  specialite: string;

  @ApiProperty({ description: 'Nom complet du membre' })
  name: string;

  @ApiProperty({ description: 'Email du membre' })
  email: string;

  @ApiProperty({ description: 'Date de début' })
  dateDebut: string;

  @ApiProperty({ description: 'Statut actuel' })
  status: string;

  @ApiProperty({ description: 'Initiales du membre' })
  initials: string;

  @ApiProperty({ description: 'Couleur associée' })
  color: string;

  @ApiProperty({ description: 'Favori ou non' })
  starred?: boolean;
}

export class AttendanceWeekDto {
  @ApiProperty({ description: "ID de l'utilisateur" })
  userId: string;

  @ApiProperty({
    description: 'Statuts de présence pour la semaine',
    type: [String],
  })
  weekStatuses: string[];
}
