import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../src/modules/users/user.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from '../../../src/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/modules/users/dto/update-user.dto';

describe('UserService', () => {
  let service: UserService;

  const userSelect = {
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
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: { deleteMany: jest.fn() },
    siteMembership: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: UserRole.OWNER,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const expectedUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: createUserDto.email,
        role: createUserDto.role,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        organizationId: createUserDto.organizationId,
        createdAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(
        createUserDto,
        createUserDto.organizationId,
      );

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: expect.stringMatching(/^\$2b\$/),
          role: createUserDto.role,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          organization: {
            connect: { id: createUserDto.organizationId },
          },
        },
        select: userSelect,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const expectedUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          role: UserRole.OWNER,
          firstName: 'John',
          lastName: 'Doe',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          role: UserRole.COLLABORATEUR,
          firstName: 'Jane',
          lastName: 'Smith',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date(),
        },
      ];

      const total = 2;
      mockPrismaService.$transaction.mockResolvedValue([expectedUsers, total]);

      const result = await service.findAll(
        1,
        20,
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toEqual({
        data: expectedUsers,
        total,
        page: 1,
        limit: 20,
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should not return a user from another organization', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('user-from-other-org', 'org-a'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-from-other-org', organizationId: 'org-a' },
        select: userSelect,
      });
    });

    it('should return a user by id', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: UserRole.OWNER,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(expectedUser);

      const result = await service.findOne(
        userId,
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
        },
        select: userSelect,
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'updatedHash',
        role: UserRole.OWNER,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
      };

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        role: UserRole.OWNER,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      mockPrismaService.user.findFirst.mockResolvedValue({ id: userId });
      const result = await service.update(
        userId,
        updateUserDto,
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: userId,
            organizationId: '123e4567-e89b-12d3-a456-426614174000',
          },
          select: userSelect,
        }),
      );
    });
    it('should throw NotFoundException when the user does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('unknown-user', { firstName: 'X' }, 'org-a'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.remove('unknown-user', 'org-a')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });

    it('should delete a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: UserRole.OWNER,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
      };

      mockPrismaService.user.delete.mockResolvedValue(expectedUser);

      mockPrismaService.user.findFirst.mockResolvedValue({ id: userId });
      const result = await service.remove(
        userId,
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toEqual({ message: `User ${userId} deleted` });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  // ─── createUser (auth method) ─────────────────────────────────────────────
  describe('createUser', () => {
    it('should hash the password and create the user', async () => {
      const input = {
        email: 'auth@example.com',
        password: 'PlainPass1!',
        firstName: 'Auth',
        lastName: 'User',
      };
      const createdUser = {
        id: 'user-auth-1',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.OWNER,
        organizationId: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.createUser(input);

      expect(result).toEqual(createdUser);
      // The password passed to prisma.create should be a bcrypt hash, not the plain text
      const callData = mockPrismaService.user.create.mock.calls[0][0].data;
      expect(callData.password).toMatch(/^\$2b\$/);
      expect(callData.password).not.toBe(input.password);
      expect(callData.role).toBe(UserRole.COLLABORATEUR);
    });

    it('should connect organization when organizationId is provided', async () => {
      const orgId = 'org-uuid-1';
      const input = {
        email: 'auth@example.com',
        password: 'PlainPass1!',
        firstName: 'Auth',
        lastName: 'User',
        organizationId: orgId,
      };
      mockPrismaService.user.create.mockResolvedValue({ id: 'u1' });

      await service.createUser(input);

      const callData = mockPrismaService.user.create.mock.calls[0][0].data;
      expect(callData.organization).toEqual({ connect: { id: orgId } });
    });

    it('should not include organization key when organizationId is absent', async () => {
      const input = {
        email: 'noorg@example.com',
        password: 'PlainPass1!',
        firstName: 'No',
        lastName: 'Org',
      };
      mockPrismaService.user.create.mockResolvedValue({ id: 'u2' });

      await service.createUser(input);

      const callData = mockPrismaService.user.create.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('organization');
    });
  });

  // ─── findByEmail ──────────────────────────────────────────────────────────
  describe('findByEmail', () => {
    it('should return the user when found', async () => {
      const email = 'found@example.com';
      const user = {
        id: 'u-3',
        email,
        password: '$2b$hash',
        role: UserRole.OWNER,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail(email);

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  // ─── update without password ──────────────────────────────────────────────
  describe('update (no password change)', () => {
    it('should update user fields without hashing when no password is provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const dto: UpdateUserDto = { firstName: 'Changed' };
      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        firstName: 'Changed',
      });

      mockPrismaService.user.findFirst.mockResolvedValue({ id: userId });
      await service.update(userId, dto, '123e4567-e89b-12d3-a456-426614174000');

      const callData = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('password');
      expect(callData.firstName).toBe('Changed');
    });
  });

  describe('organization administration', () => {
    it('updates a role only for a user in the organization', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        role: UserRole.CHEF_PROJET,
      });

      await expect(
        service.updateRole('user-1', { role: UserRole.CHEF_PROJET }, 'org-1'),
      ).resolves.toMatchObject({ role: UserRole.CHEF_PROJET });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', organizationId: 'org-1' },
        select: { id: true, role: true },
      });
    });

    it('revokes sessions without deleting site assignments when access is disabled', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        isActive: false,
      });

      await service.updateAccess('user-1', { isActive: false }, 'org-1');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrismaService.siteMembership.findMany).not.toHaveBeenCalled();
    });

    it('lists assignments after checking the organization boundary', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.siteMembership.findMany.mockResolvedValue([]);

      await expect(service.findAssignments('user-1', 'org-1')).resolves.toEqual(
        [],
      );
      expect(mockPrismaService.siteMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', site: { organizationId: 'org-1' } },
        }),
      );
    });
  });

  describe('updateProfile', () => {
    it('updates the name and email of the authenticated user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-1' });

      await service.updateProfile('user-1', {
        firstName: ' Jean ',
        lastName: 'Martin',
        email: ' jean@konstrukt.fr ',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          firstName: 'Jean',
          lastName: 'Martin',
          email: 'jean@konstrukt.fr',
        },
        select: userSelect,
      });
    });

    it('refuses an email already used by another account', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-2' });

      await expect(
        service.updateProfile('user-1', { email: 'pris@konstrukt.fr' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('never updates the role or the organization', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-1' });

      await service.updateProfile('user-1', {
        firstName: 'Jean',
        role: UserRole.OWNER,
        organizationId: 'org-b',
      } as never);

      const [[call]] = mockPrismaService.user.update.mock.calls as [
        [{ data: Record<string, unknown> }],
      ];
      expect(call.data).not.toHaveProperty('role');
      expect(call.data).not.toHaveProperty('organizationId');
    });

    it('throws 404 when the user no longer exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-1', { firstName: 'Jean' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMe', () => {
    it('returns the authenticated user without filtering by organization', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const result = await service.findMe('user-1');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: userSelect,
      });
      expect(result).toEqual({ id: 'user-1' });
    });

    it('throws 404 when the user no longer exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findMe('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('role hierarchy', () => {
    const orgId = '123e4567-e89b-12d3-a456-426614174000';

    it('prevents an ADMIN_ORGANIZATION from creating an OWNER', async () => {
      await expect(
        service.create(
          {
            email: 'owner@example.com',
            password: 'password123',
            firstName: 'New',
            lastName: 'Owner',
            role: UserRole.OWNER,
          },
          orgId,
          'admin-1',
          UserRole.ADMIN_ORGANIZATION,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('prevents an ADMIN_ORGANIZATION from promoting a user to OWNER', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        role: UserRole.COLLABORATEUR,
      });

      await expect(
        service.updateRole(
          'user-1',
          { role: UserRole.OWNER },
          orgId,
          UserRole.ADMIN_ORGANIZATION,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('prevents an ADMIN_ORGANIZATION from editing or deleting an OWNER', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        role: UserRole.OWNER,
      });

      await expect(
        service.update(
          'owner-1',
          { firstName: 'Changed' },
          orgId,
          'admin-1',
          UserRole.ADMIN_ORGANIZATION,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(
          'owner-1',
          orgId,
          'admin-1',
          UserRole.ADMIN_ORGANIZATION,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });
  });
});
