import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, Matches } from 'class-validator';
import { AttendanceStatus } from './create-attendance.dto';

export class UpsertAttendanceDto {
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
}
