import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'ID du chantier',
  })
  @IsUUID('4')
  siteId: string;

  @ApiProperty({ example: 'Équipe Gros Œuvre', description: "Nom de l'équipe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000002',
    description: "ID du chef d'équipe (optionnel)",
  })
  @IsOptional()
  @IsUUID('4')
  leaderId?: string;
}
