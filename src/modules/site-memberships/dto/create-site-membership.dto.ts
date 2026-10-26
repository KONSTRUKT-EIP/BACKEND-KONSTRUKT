import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateSiteMembershipDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('all')
  userId: string;

  @ApiProperty({ enum: UserRole, example: UserRole.COLLABORATEUR })
  @IsEnum(UserRole)
  role: UserRole;
}
