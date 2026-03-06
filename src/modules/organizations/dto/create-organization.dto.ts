import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Konstrukt BTP',
    description: "Nom de l'organisation",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'PRO',
    description: 'Plan tarifaire (FREE, PRO, ENTERPRISE)',
  })
  @IsString()
  @IsNotEmpty()
  plan: string;

  @ApiPropertyOptional({ example: true, description: 'Organisation active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
