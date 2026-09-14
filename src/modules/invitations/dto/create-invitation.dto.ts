import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'collaborator@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.COLLABORATEUR })
  @IsEnum(UserRole)
  role: UserRole;
}
