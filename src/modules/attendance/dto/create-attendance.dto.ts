import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
    example: '00000000-0000-0000-0000-000000000001',
    description: "ID de l'équipe",
  })
  @IsUUID('4')
  teamId: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000002',
    description: "ID de l'utilisateur",
  })
  @IsUUID('4')
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
