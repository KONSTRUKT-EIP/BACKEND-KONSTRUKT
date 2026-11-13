import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SITE_ROLES } from '../../../shared/authorization/site-policies';
import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'collaborator@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: SITE_ROLES, example: UserRole.COLLABORATEUR })
  @IsIn(SITE_ROLES)
  role: UserRole;
}
