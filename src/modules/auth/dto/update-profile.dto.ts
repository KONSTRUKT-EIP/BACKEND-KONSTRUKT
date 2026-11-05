import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Champs qu'un utilisateur peut modifier lui-même (le rôle et l'organisation restent réservés aux admins)
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le prénom ne peut pas être vide' })
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Martin' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide' })
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: 'jean.martin@konstrukt.fr' })
  @IsOptional()
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide" })
  email?: string;
}
