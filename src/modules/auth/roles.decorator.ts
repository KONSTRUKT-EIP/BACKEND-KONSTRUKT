import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../shared/types/roles.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
