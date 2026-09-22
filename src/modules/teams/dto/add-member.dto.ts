import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum TeamMemberRole {
  WORKER = 'WORKER',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
}

export class AddMemberDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    description: "ID de l'utilisateur à ajouter",
  })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'userId must be a valid UUID format',
  })
  userId: string;

  @ApiPropertyOptional({
    enum: TeamMemberRole,
    default: TeamMemberRole.WORKER,
    description: "Rôle dans l'équipe",
  })
  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;
}
