import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
    organizationId: true,
    createdAt: true,
    password: false,
  } as const;

  async create(data: CreateUserDto, organizationId?: string | null) {
    if (!organizationId) {
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
        ...(organizationId && {
          organization: { connect: { id: organizationId } },
        }),
      },
      select: this.userSelect,
    });
  }

  async findAll(page = 1, limit = 20, organizationId?: string | null) {
    if (!organizationId) {
      return { data: [], total: 0, page, limit };
    }
    const skip = (page - 1) * limit;
    const where = { organizationId };
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

  async findOne(id: string, organizationId?: string | null) {
    if (!organizationId) return null;
    return this.prisma.user.findFirst({
      where: { id, organizationId },
      select: this.userSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto, organizationId?: string | null) {
    if (!organizationId) return null;
    const { password, ...rest } = dto;
    const existingUser = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!existingUser) return null;
    const data: Record<string, unknown> = { ...rest };
    delete data.organizationId;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: organizationId ? { id, organizationId } : { id },
      data,
      select: this.userSelect,
    });
  }

  async remove(id: string, organizationId?: string | null) {
    if (!organizationId) return { message: `User ${id} deleted` };
    const existingUser = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!existingUser) return { message: `User ${id} deleted` };
    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${id} deleted` };
  }
}
