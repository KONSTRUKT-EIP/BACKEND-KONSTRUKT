import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  email?: string;
  passwordHash?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
}
