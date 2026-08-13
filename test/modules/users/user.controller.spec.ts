import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserController } from '../../../src/modules/users/user.controller';
import { UserService } from '../../../src/modules/users/user.service';
import { UserRole } from '@prisma/client';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let validationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    // Use the same ValidationPipe as in main.ts
    const { ValidationPipe } = require('@nestjs/common');
    validationPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user with valid data', async () => {
      const createUserInput = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const expectedUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: createUserInput.email,
        passwordHash: createUserInput.password,
        role: createUserInput.role,
        firstName: createUserInput.firstName,
        lastName: createUserInput.lastName,
        organizationId: createUserInput.organizationId,
        createdAt: new Date(),
      };

      mockUserService.create.mockResolvedValue(expectedUser);

      const result = await controller.create(createUserInput);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: createUserInput.email,
        password: createUserInput.password,
        role: createUserInput.role,
        firstName: createUserInput.firstName,
        lastName: createUserInput.lastName,
        organizationId: createUserInput.organizationId,
      });
    });

    const { plainToInstance } = require('class-transformer');
    const { CreateUserDto } = require('../../../src/modules/users/dto/create-user.dto');

    it('should throw BadRequestException with invalid email', async () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'password123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const dto = plainToInstance(CreateUserDto, invalidInput);
      await expect(
        validationPipe.transform(dto, { type: 'body', metatype: CreateUserDto })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with short password', async () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const dto = plainToInstance(CreateUserDto, invalidInput);
      await expect(
        validationPipe.transform(dto, { type: 'body', metatype: CreateUserDto })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with invalid organizationId', async () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: 'not-a-uuid',
      };
      const dto = plainToInstance(CreateUserDto, invalidInput);
      await expect(
        validationPipe.transform(dto, { type: 'body', metatype: CreateUserDto })
      ).rejects.toThrow(BadRequestException);
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
      ];

      mockUserService.findAll.mockResolvedValue(expectedUsers);

      const result = await controller.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockUserService.findAll).toHaveBeenCalled();
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

      mockUserService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const updateInput = {
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
        passwordHash: 'updatedHash',
        role: UserRole.ADMIN,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
        createdAt: new Date(),
      };

      mockUserService.update.mockResolvedValue(expectedUser);

      const result = await controller.update(userId, updateInput);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.update).toHaveBeenCalledWith(userId, {
        email: 'updated@example.com',
        role: UserRole.ADMIN,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        organizationId: '123e4567-e89b-12d3-a456-426614174099',
        password: 'updatedHash',
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

      mockUserService.remove.mockResolvedValue(expectedUser);

      const result = await controller.remove(userId);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.remove).toHaveBeenCalledWith(userId);
    });
  });
});
