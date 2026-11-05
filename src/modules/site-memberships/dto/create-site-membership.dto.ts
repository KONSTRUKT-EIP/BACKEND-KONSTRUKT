import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SITE_ROLES } from '../../../shared/authorization/site-policies';
import { IsIn, IsUUID } from 'class-validator';

export class CreateSiteMembershipDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('all')
  userId: string;

  @ApiProperty({ enum: SITE_ROLES, example: UserRole.COLLABORATEUR })
  @IsIn(SITE_ROLES)
  role: UserRole;
}
