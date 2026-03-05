import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Rich query methods (used by auth) ---

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        email: true,
        lastName: true,
        role: true,
        organization: { select: { id: true, name: true } },
        password: false,
      },
    });
  }

  async getUser({ userId }: { userId: string }) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        email: true,
        lastName: true,
        role: true,
        organization: { select: { id: true, name: true } },
        password: false,
      },
    });
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
        role: data.role ?? UserRole.ADMIN,
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

  async create(data: CreateUserDto) {
    const password = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.organizationId && {
          organization: { connect: { id: data.organizationId } },
        }),
      },
      select: this.userSelect,
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ skip, take: limit, select: this.userSelect }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${id} deleted` };
  }
}
