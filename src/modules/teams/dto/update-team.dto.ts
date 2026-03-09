import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Équipe Finitions' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID('4')
  leaderId?: string;
}
