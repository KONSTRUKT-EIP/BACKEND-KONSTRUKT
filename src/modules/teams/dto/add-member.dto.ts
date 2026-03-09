import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000003',
    description: "ID de l'utilisateur à ajouter",
  })
  @IsUUID('4')
  userId: string;

  @ApiPropertyOptional({
    example: 'CHEF_EQUIPE',
    description: "Rôle dans l'équipe (ex: WORKER, CHEF_EQUIPE)",
    default: 'WORKER',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string;
}
