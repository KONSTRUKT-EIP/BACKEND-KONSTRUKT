import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { userPayload } from './jwt.strategy';
import { UserService } from '../users/user.service';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';
import { UserRole } from '../../shared/types/roles.enum';
import { CreateOrganizationOnboardingDto } from './dto/create-organization-onboarding.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    this.logger.log(`[LOGIN] Attempt for email: ${dto.email}`);
    const existingUser = await this.userService.findByEmail(dto.email);

    if (!existingUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, existingUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authenticateUser({
      userId: existingUser.id,
      organizationId: existingUser.organizationId,
      role: existingUser.role,
    });
  }

  async createOrganizationOnboarding(dto: CreateOrganizationOnboardingDto) {
    this.logger.log(`[ONBOARDING] Attempt for email: ${dto.email}`);

    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const password = await hash(dto.password, 10);
    const { organization, user } = await this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
            plan: dto.plan,
          },
        });

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: UserRole.ADMIN,
            organizationId: organization.id,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            createdAt: true,
          },
        });

        return { organization, user };
      },
    );

    const tokens = await this.authenticateUser({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return { ...tokens, organization, user };
  }

  async refreshTokens(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    // Token rotation: delete the old token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    return this.authenticateUser({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    this.logger.log(`[LOGOUT] All refresh tokens deleted for user: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const hashedPassword = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    this.logger.log(
      `[CHANGE_PASSWORD] Password updated and refresh tokens revoked for user: ${userId}`,
    );
    return { message: 'Password changed successfully' };
  }

  async getAccessibleSites(user: userPayload) {
    if (!user.organizationId) return [];

    if (user.role === UserRole.ADMIN) {
      const sites = await this.prisma.site.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return sites.map((site) => ({
        ...site,
        membershipRole: UserRole.ADMIN,
      }));
    }

    const memberships = await this.prisma.siteMembership.findMany({
      where: {
        userId: user.userId,
        isActive: true,
        site: { organizationId: user.organizationId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        site: true,
      },
    });

    return memberships.map(({ site, role }) => ({
      ...site,
      membershipRole: role,
    }));
  }

  async authenticateUser({
    userId,
    organizationId,
    role,
  }: {
    userId: string;
    organizationId?: string | null;
    role: UserRole;
  }) {
    const payload: userPayload = { userId, organizationId, role };
    const access_token = await this.jwtService.signAsync(payload);

    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { access_token, refresh_token: refreshToken };
  }
}
