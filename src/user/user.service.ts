import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async getUsers() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        firstName: true,
        email: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        password: false,
      },
    });
    return users;
  }

  async getUser({ userId }: { userId: string }) {
    const users = await this.prismaService.user.findMany({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        email: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        password: false,
      },
    });
    return users;
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    organizationId: string;
  }) {
    const password = await bcrypt.hash(data.password, 10);
    return this.prismaService.user.create({
      data: {
        email: data.email,
        password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? UserRole.OUVRIER,
        organization: {
          connect: { id: data.organizationId },
        },
      },
    });
  }
}
