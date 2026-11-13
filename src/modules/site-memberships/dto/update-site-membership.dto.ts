import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SITE_ROLES } from '../../../shared/authorization/site-policies';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateSiteMembershipDto {
  @ApiPropertyOptional({ enum: SITE_ROLES, example: UserRole.COLLABORATEUR })
  @IsOptional()
  @IsIn(SITE_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
