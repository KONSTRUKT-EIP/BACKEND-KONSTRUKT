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
        role: data.role ?? UserRole.OUVRIER,
        ...(data.organizationId && {
          organization: { connect: { id: data.organizationId } },
        }),
      },
    });
  }

  // --- CRUD methods ---

  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        organization: { connect: { id: data.organizationId } },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
