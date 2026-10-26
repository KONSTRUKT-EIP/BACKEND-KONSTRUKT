import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: '145ec198-2744-4ae2-b139-eaa309d293ca',
    description: 'ID du chantier',
  })
  @IsUUID('all')
  siteId: string;

  @ApiProperty({ example: 'Équipe Gros Œuvre', description: "Nom de l'équipe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '7b3e4f89-1c5d-4a2e-9f7b-3c8a6e2d4f5a',
    description: "ID du chef d'équipe (optionnel)",
  })
  @IsOptional()
  @IsUUID('all')
  leaderId?: string;
}
