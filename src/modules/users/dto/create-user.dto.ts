import { UserRole } from '@prisma/client';

export class CreateUserDto {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  organizationId?: string;
}
