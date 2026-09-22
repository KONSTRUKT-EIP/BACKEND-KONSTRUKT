import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { userPayload } from './jwt.strategy';
import { UserService } from '../users/user.service';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';
import { UserRole } from '../../shared/types/roles.enum';

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

  async register(dto: RegisterDto) {
    this.logger.log(`[REGISTER] Attempt for email: ${dto.email}`);
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const newUser = await this.userService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.COLLABORATEUR,
    });

    return this.authenticateUser({
      userId: newUser.id,
      organizationId: newUser.organizationId,
      role: newUser.role,
    });
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

  private async authenticateUser({
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
