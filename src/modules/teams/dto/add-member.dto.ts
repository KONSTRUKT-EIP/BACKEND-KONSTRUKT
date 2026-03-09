import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum TeamMemberRole {
  WORKER = 'WORKER',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
}

export class AddMemberDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000003',
    description: "ID de l'utilisateur à ajouter",
  })
  @IsUUID('4')
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
