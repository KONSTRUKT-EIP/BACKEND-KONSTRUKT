import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserService } from '../../../src/modules/users/user.service';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ADMIN,
    organizationId: null,
    createdAt: new Date('2026-01-01'),
  };

  const mockTokens = {
    access_token: 'signed-jwt-token',
    refresh_token: 'random-refresh-token',
  };

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAuthService.login.mockResolvedValue(mockTokens);
    mockAuthService.register.mockResolvedValue(mockTokens);
    mockAuthService.refreshTokens.mockResolvedValue(mockTokens);
    mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });
    mockAuthService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });
    mockUserService.findOne.mockResolvedValue(mockUser);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'Password1!' };

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokens);
    });

    it('should propagate UnauthorizedException from authService', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login({ email: 'bad@bad.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── REGISTER ────────────────────────────────────────────────────────────
  describe('register()', () => {
    it('should call authService.register and return tokens', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password1!',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokens);
    });

    it('should propagate ConflictException from authService', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email already in use'),
      );

      await expect(
        controller.register({
          email: 'exists@example.com',
          password: 'Password1!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── REFRESH ─────────────────────────────────────────────────────────────
  describe('refresh()', () => {
    it('should call authService.refreshTokens with the token from the dto', async () => {
      const dto = { refreshToken: 'raw-refresh-token-value' };

      const result = await controller.refresh(dto);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'raw-refresh-token-value',
      );
      expect(result).toEqual(mockTokens);
    });

    it('should propagate UnauthorizedException for expired/invalid token', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Refresh token invalid or expired'),
      );

      await expect(
        controller.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── LOGOUT ──────────────────────────────────────────────────────────────
  describe('logout()', () => {
    it('should call authService.logout with userId from the request', async () => {
      const req = { user: { userId: 'user-uuid-1' } } as any;

      const result = await controller.logout(req);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
  describe('changePassword()', () => {
    it('should call authService.changePassword with userId and dto', async () => {
      const req = { user: { userId: 'user-uuid-1' } } as any;
      const dto = { oldPassword: 'OldPass1!', newPassword: 'NewPass1@' };

      const result = await controller.changePassword(req, dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should propagate UnauthorizedException when old password is wrong', async () => {
      mockAuthService.changePassword.mockRejectedValue(
        new UnauthorizedException('Old password is incorrect'),
      );
      const req = { user: { userId: 'user-uuid-1' } } as any;

      await expect(
        controller.changePassword(req, {
          oldPassword: 'WrongOld1!',
          newPassword: 'NewPass1@',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── GET ME (authenticateUser) ────────────────────────────────────────────
  describe('authenticateUser()', () => {
    it('should return the user from userService.findOne', async () => {
      const req = { user: { userId: 'user-uuid-1' } } as any;

      const result = await controller.authenticateUser(req);

      expect(mockUserService.findOne).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);
      const req = { user: { userId: 'unknown-id' } } as any;

      const result = await controller.authenticateUser(req);

      expect(result).toBeNull();
    });
  });
});
