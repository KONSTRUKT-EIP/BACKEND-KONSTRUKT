import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../src/modules/users/user.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from '../../../src/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/modules/users/dto/update-user.dto';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
        ...createUserDto,
        createdAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: createUserDto.password,
          role: createUserDto.role,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          organization: {
            connect: { id: createUserDto.organizationId },
          },
        },
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
          role: UserRole.VIEWER,
          firstName: 'Jane',
          lastName: 'Smith',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expectedUsers);

      const result = await service.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
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

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
        passwordHash: 'updatedHash',
        role: UserRole.ADMIN,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
      };

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        passwordHash: 'updatedHash',
        role: UserRole.ADMIN,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });
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

      const result = await service.remove(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });
});
