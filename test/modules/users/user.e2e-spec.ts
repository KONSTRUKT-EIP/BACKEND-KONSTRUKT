import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserModule } from '../../../src/modules/users/user.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('UserController (e2e)', () => {
  let app: INestApplication<App>;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('/users (POST)', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const expectedUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: createUserDto.email,
        passwordHash: createUserDto.password,
        role: createUserDto.role,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        organizationId: createUserDto.organizationId,
        createdAt: new Date().toISOString(),
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect((res.body as { email: string }).email).toBe(
            createUserDto.email,
          );
          expect((res.body as { firstName: string }).firstName).toBe(
            createUserDto.firstName,
          );
          expect((res.body as { lastName: string }).lastName).toBe(
            createUserDto.lastName,
          );
        });
    });

    it('should return 400 with invalid email', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: 'password123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 with short password', async () => {
      const invalidDto = {
        email: 'test@example.com',
        password: '123',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return all users', async () => {
      const expectedUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          role: UserRole.ADMIN,
          firstName: 'John',
          lastName: 'Doe',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date().toISOString(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          role: UserRole.VIEWER,
          firstName: 'Jane',
          lastName: 'Smith',
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: new Date().toISOString(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expectedUsers);

      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect((res.body as Array<{ email: string }>)[0].email).toBe(
            'user1@example.com',
          );
          expect((res.body as Array<{ email: string }>)[1].email).toBe(
            'user2@example.com',
          );
        });
    });
  });

  describe('/users/:id (GET)', () => {
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
        createdAt: new Date().toISOString(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect((res.body as { id: string }).id).toBe(userId);
          expect((res.body as { email: string }).email).toBe(
            'test@example.com',
          );
        });
    });
  });

  describe('/users/:id (PUT)', () => {
    it('should update a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const updateDto = {
        email: 'updated@example.com',
      };

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        passwordHash: 'hash',
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date().toISOString(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect((res.body as { email: string }).email).toBe(
            'updated@example.com',
          );
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
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
        createdAt: new Date().toISOString(),
      };

      mockPrismaService.user.delete.mockResolvedValue(expectedUser);

      return request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect((res.body as { id: string }).id).toBe(userId);
        });
    });
  });
});
