import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserService } from '../../../src/modules/users/user.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.ADMIN,
  organizationId: null,
  createdAt: new Date(),
};

const mockRefreshToken = {
  id: 'token-uuid-1',
  userId: mockUser.id,
  token: 'random-refresh-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<Partial<UserService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      getUser: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue(mockRefreshToken),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('should return access_token and refresh_token on valid credentials', async () => {
      const hashedPwd = await bcrypt.hash('Password1!', 10);
      (userService.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: hashedPwd,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.access_token).toBe('signed-jwt-token');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hashedPwd = await bcrypt.hash('CorrectPassword1!', 10);
      (userService.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: hashedPwd,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── REGISTER ─────────────────────────────────────────────────────────────
  describe('register()', () => {
    it('should create user and return tokens on success', async () => {
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);
      (userService.createUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password1!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(userService.createUser).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already in use', async () => {
      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password1!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── REFRESH TOKENS ───────────────────────────────────────────────────────
  describe('refreshTokens()', () => {
    it('should return new tokens on valid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);
      (userService.getUser as jest.Mock).mockResolvedValue(mockUser);
      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refreshTokens('random-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(prisma.refreshToken.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('bad-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      await expect(
        service.refreshTokens('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  describe('logout()', () => {
    it('should delete all refresh tokens for the user', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.logout(mockUser.id);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
  describe('changePassword()', () => {
    it('should update password when old password is correct', async () => {
      const oldPassword = 'OldPassword1!';
      const hashedOld = await bcrypt.hash(oldPassword, 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedOld,
      });
      prisma.user.update.mockResolvedValue({ ...mockUser });

      const result = await service.changePassword(mockUser.id, {
        oldPassword,
        newPassword: 'NewPassword1!',
      });

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw UnauthorizedException when old password is wrong', async () => {
      const hashedOld = await bcrypt.hash('RealOldPass1!', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedOld,
      });

      await expect(
        service.changePassword(mockUser.id, {
          oldPassword: 'WrongOldPass1!',
          newPassword: 'NewPassword1!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
