import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    example: 'Konstrukt BTP',
    description: "Nom de l'organisation",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ENTERPRISE', description: 'Plan tarifaire' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: false, description: 'Organisation active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
