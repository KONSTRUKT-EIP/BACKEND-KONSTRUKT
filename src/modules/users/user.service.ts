import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from '@prisma/client';
import { canAssignRole } from '../../shared/authorization/site-policies';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    organizationId?: string | null,
    userId?: string,
  ) {
    if (organizationId) {
      return organizationId;
    }

    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    return user?.organizationId ?? null;
  }

  // Auth method – hashes password before storing
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    organizationId?: string;
  }) {
    const password = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? UserRole.COLLABORATEUR,
        ...(data.organizationId && {
          organization: { connect: { id: data.organizationId } },
        }),
      },
    });
  }

  // --- CRUD methods ---

  private readonly userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    isActive: true,
    organizationId: true,
    createdAt: true,
    _count: { select: { siteMemberships: true } },
    password: false,
  } as const;

  async create(
    data: CreateUserDto,
    organizationId?: string | null,
    userId?: string,
    actorRole?: UserRole,
  ) {
    if (actorRole) this.assertCanAssign(actorRole, data.role);
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const password = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(resolvedOrganizationId && {
          organization: { connect: { id: resolvedOrganizationId } },
        }),
      },
      select: this.userSelect,
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    organizationId?: string | null,
    userId?: string,
  ) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) {
      return { data: [], total: 0, page, limit };
    }
    const skip = (page - 1) * limit;
    const where = { organizationId: resolvedOrganizationId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: this.userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, organizationId?: string | null, userId?: string) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) return null;
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId: resolvedOrganizationId },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    organizationId?: string | null,
    actorRole?: UserRole,
  ) {
    const user = await this.findManagedUser(id, organizationId);
    if (actorRole) {
      this.assertCanAssign(actorRole, user.role);
      this.assertCanAssign(actorRole, dto.role);
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: { role: dto.role },
      select: this.userSelect,
    });
  }

  async updateAccess(
    id: string,
    dto: UpdateUserAccessDto,
    organizationId?: string | null,
    actorRole?: UserRole,
  ) {
    const user = await this.findManagedUser(id, organizationId);
    if (actorRole) this.assertCanAssign(actorRole, user.role);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: dto.isActive },
      select: this.userSelect,
    });

    if (!dto.isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return updatedUser;
  }

  async findAssignments(id: string, organizationId?: string | null) {
    await this.findManagedUser(id, organizationId);

    return this.prisma.siteMembership.findMany({
      where: {
        userId: id,
        site: { organizationId: organizationId ?? undefined },
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        createdAt: true,
        site: {
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findManagedUser(id: string, organizationId?: string | null) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    organizationId?: string | null,
    userId?: string,
    actorRole?: UserRole,
  ) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) return null;
    const { password, ...rest } = dto;
    const existingUser = await this.prisma.user.findFirst({
      where: { id, organizationId: resolvedOrganizationId },
    });
    if (!existingUser) throw new NotFoundException(`User ${id} not found`);
    if (actorRole) {
      this.assertCanAssign(actorRole, existingUser.role);
      if (dto.role) this.assertCanAssign(actorRole, dto.role);
    }
    const data: Record<string, unknown> = { ...rest };
    delete data.organizationId;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id, organizationId: resolvedOrganizationId },
      data,
      select: this.userSelect,
    });
  }

  async remove(
    id: string,
    organizationId?: string | null,
    userId?: string,
    actorRole?: UserRole,
  ) {
    const resolvedOrganizationId = await this.resolveOrganizationId(
      organizationId,
      userId,
    );

    if (!resolvedOrganizationId) return { message: `User ${id} deleted` };
    const existingUser = await this.prisma.user.findFirst({
      where: { id, organizationId: resolvedOrganizationId },
    });
    if (!existingUser) throw new NotFoundException(`User ${id} not found`);
    if (actorRole) this.assertCanAssign(actorRole, existingUser.role);
    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${id} deleted` };
  }

  private assertCanAssign(actorRole: UserRole, targetRole: UserRole) {
    if (!canAssignRole(actorRole, targetRole)) {
      throw new ForbiddenException(
        `Role ${actorRole} cannot manage a user with role ${targetRole}`,
      );
    }
  }
}
