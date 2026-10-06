import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Équipe Finitions' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '7b3e4f89-1c5d-4a2e-9f7b-3c8a6e2d4f5a' })
  @IsOptional()
  @IsUUID('all')
  leaderId?: string;
}
