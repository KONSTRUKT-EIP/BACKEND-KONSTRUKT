import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  RETARD = 'RETARD',
  CONGE = 'CONGE',
}

export class CreateAttendanceDto {
  @ApiProperty({
    example: 'f1e2d3c4-b5a6-4789-0123-456789abcdef',
    description: "ID de l'équipe",
  })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'teamId must be a valid UUID',
  })
  teamId: string;

  @ApiProperty({
    example: '2a3b4c5d-6e7f-4890-1234-567890abcdef',
    description: "ID de l'utilisateur",
  })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'userId must be a valid UUID',
  })
  userId: string;

  @ApiProperty({
    example: '2026-03-09',
    description: 'Date de présence (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    description: 'Statut de présence',
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({
    example: '2026-03-09T07:30:00.000Z',
    description: "Heure d'arrivée (ISO 8601)",
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    example: '2026-03-09T16:00:00.000Z',
    description: 'Heure de départ (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Minutes de retard (si statut = RETARD)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minutesLate?: number;

  @ApiPropertyOptional({
    example: 'Congé maladie',
    description: 'Notes libres',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
