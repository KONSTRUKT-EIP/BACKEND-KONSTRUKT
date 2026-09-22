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
    organizationId: true,
    createdAt: true,
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
        role: UserRole.ADMIN,
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
          role: UserRole.ADMIN,
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

      expect(result).toEqual({ data: expectedUsers, total, page: 1, limit: 20 });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should not return a user from another organization', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.findOne('user-from-other-org', 'org-a');

      expect(result).toBeNull();
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
        role: UserRole.ADMIN,
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
        role: UserRole.ADMIN,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
      };

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        role: UserRole.ADMIN,
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
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: UserRole.ADMIN,
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
        role: UserRole.ADMIN,
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
      const user = { id: 'u-3', email, password: '$2b$hash', role: UserRole.ADMIN };
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
      mockPrismaService.user.update.mockResolvedValue({ id: userId, firstName: 'Changed' });

      mockPrismaService.user.findFirst.mockResolvedValue({ id: userId });
      await service.update(userId, dto, '123e4567-e89b-12d3-a456-426614174000');

      const callData = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('password');
      expect(callData.firstName).toBe('Changed');
    });
  });
});

