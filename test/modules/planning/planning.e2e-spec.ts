import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { JwtAuthGuard } from '../../../src/modules/auth/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/roles.guard';
import { TaskStatus, TaskType, AlertType, AlertSeverity } from '@prisma/client';

const mockSiteZone = {
  id: 'zone-uuid-1',
  siteId: 'site-uuid-1',
  name: 'Secteur A',
  level: '1',
  description: 'Zone de test',
  createdAt: new Date(),
};

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ADMIN',
  organizationId: null,
  createdAt: new Date(),
};

const mockTask = {
  id: 'task-uuid-1',
  siteZoneId: mockSiteZone.id,
  assignedToId: mockUser.id,
  name: 'Coulage dalle',
  description: 'Test task',
  type: TaskType.GROS_OEUVRE,
  priority: 1,
  plannedEnd: new Date('2026-03-15'),
  realStart: null,
  realEnd: null,
  status: TaskStatus.EN_COURS,
  createdAt: new Date(),
  time: '08:00',
  siteZone: mockSiteZone,
  assignedTo: mockUser,
  alerts: [],
};

const mockAlert = {
  id: 'alert-uuid-1',
  taskId: mockTask.id,
  type: AlertType.RETARD,
  severity: AlertSeverity.HIGH,
  message: 'Tâche en retard',
  isRead: false,
  createdAt: new Date(),
  task: {
    ...mockTask,
    siteZone: mockSiteZone,
  },
};

describe('Planning (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: {
    task: {
      findMany: jest.Mock<any, any>;
      findUnique: jest.Mock<any, any>;
      create: jest.Mock<any, any>;
      update: jest.Mock<any, any>;
      delete: jest.Mock<any, any>;
    };
    siteZone: {
      findUnique: jest.Mock<any, any>;
    };
    user: {
      findUnique: jest.Mock<any, any>;
    };
    taskAlert: {
      findMany: jest.Mock<any, any>;
      findUnique: jest.Mock<any, any>;
      create: jest.Mock<any, any>;
      update: jest.Mock<any, any>;
    };
    $connect: jest.Mock<any, any>;
    $disconnect: jest.Mock<any, any>;
  };

  beforeEach(async () => {
    prismaService = {
      task: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      siteZone: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      taskAlert: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /planning/tasks', () => {
    it('should return all planning tasks', () => {
      prismaService.task.findMany.mockResolvedValue([mockTask]);

      return request(app.getHttpServer())
        .get('/planning/tasks')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body).toHaveLength(1);
          expect((res.body as (typeof mockAlert)[])[0]).toHaveProperty('id');
          expect((res.body as (typeof mockTask)[])[0]).toHaveProperty('label');
          expect((res.body as (typeof mockTask)[])[0]).toHaveProperty('date');
          expect((res.body as (typeof mockTask)[])[0]).toHaveProperty('status');
        });
    });

    it('should filter tasks by date range', () => {
      prismaService.task.findMany.mockResolvedValue([mockTask]);

      return request(app.getHttpServer())
        .get('/planning/tasks?startDate=2026-03-10&endDate=2026-03-16')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });

    it('should filter tasks by siteZoneId', () => {
      prismaService.task.findMany.mockResolvedValue([mockTask]);

      return request(app.getHttpServer())
        .get('/planning/tasks?siteZoneId=zone-uuid-1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });
  });

  describe('GET /planning/tasks/:id', () => {
    it('should return a task by id', () => {
      prismaService.task.findUnique.mockResolvedValue(mockTask);

      return request(app.getHttpServer())
        .get('/planning/tasks/task-uuid-1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 'task-uuid-1');
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 when task does not exist', () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/planning/tasks/invalid-uuid')
        .expect(404);
    });
  });

  describe('POST /planning/tasks', () => {
    const createDto = {
      siteZoneId: 'zone-uuid-1',
      assignedToId: 'user-uuid-1',
      name: 'Nouvelle tâche',
      description: 'Description',
      type: TaskType.GROS_OEUVRE,
      priority: 1,
      plannedEnd: '2026-03-15T17:00:00Z',
      time: '08:00',
    };

    it('should create a new task', () => {
      prismaService.siteZone.findUnique.mockResolvedValue(mockSiteZone);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.task.create.mockResolvedValue(mockTask);

      return request(app.getHttpServer())
        .post('/planning/tasks')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 when siteZone does not exist', () => {
      prismaService.siteZone.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/planning/tasks')
        .send(createDto)
        .expect(404);
    });

    it('should return 404 when user does not exist', () => {
      prismaService.siteZone.findUnique.mockResolvedValue(mockSiteZone);
      prismaService.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/planning/tasks')
        .send(createDto)
        .expect(404);
    });
  });

  describe('PUT /planning/tasks/:id', () => {
    const updateDto = {
      name: 'Tâche mise à jour',
      status: TaskStatus.TERMINEE,
    };

    it('should update a task', () => {
      prismaService.task.findUnique.mockResolvedValue(mockTask);
      prismaService.task.update.mockResolvedValue({
        ...mockTask,
        ...updateDto,
      });

      return request(app.getHttpServer())
        .put('/planning/tasks/task-uuid-1')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 'task-uuid-1');
        });
    });

    it('should return 404 when task does not exist', () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .put('/planning/tasks/invalid-uuid')
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /planning/tasks/:id', () => {
    it('should delete a task', () => {
      prismaService.task.findUnique.mockResolvedValue(mockTask);
      prismaService.task.delete.mockResolvedValue(mockTask);

      return request(app.getHttpServer())
        .delete('/planning/tasks/task-uuid-1')
        .expect(200)
        .expect((res: { body: { message: string } }) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('supprimée avec succès');
        });
    });

    it('should return 404 when task does not exist', () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .delete('/planning/tasks/invalid-uuid')
        .expect(404);
    });
  });

  describe('GET /planning/actions', () => {
    it('should return all actions', () => {
      prismaService.taskAlert.findMany.mockResolvedValue([mockAlert]);

      return request(app.getHttpServer())
        .get('/planning/actions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body).toHaveLength(1);
          expect((res.body as (typeof mockAlert)[])[0]).toHaveProperty('id');
          expect((res.body as (typeof mockAlert)[])[0]).toHaveProperty('icon');
          expect((res.body as (typeof mockAlert)[])[0]).toHaveProperty('label');
          expect((res.body as (typeof mockAlert)[])[0]).toHaveProperty('badge');
        });
    });
  });

  describe('GET /planning/tasks/:id/actions', () => {
    it('should return actions for a specific task', () => {
      prismaService.task.findUnique.mockResolvedValue(mockTask);
      prismaService.taskAlert.findMany.mockResolvedValue([mockAlert]);

      return request(app.getHttpServer())
        .get('/planning/tasks/task-uuid-1/actions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });

    it('should return 404 when task does not exist', () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/planning/tasks/invalid-uuid/actions')
        .expect(404);
    });
  });

  describe('DELETE /planning/actions/:id', () => {
    it('should mark an action as read', () => {
      prismaService.taskAlert.findUnique.mockResolvedValue(mockAlert);
      prismaService.taskAlert.update.mockResolvedValue({
        ...mockAlert,
        isRead: true,
      });

      return request(app.getHttpServer())
        .delete('/planning/actions/alert-uuid-1')
        .expect(200)
        .expect((res: { body: { message: string } }) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('marquée comme lue');
        });
    });

    it('should return 404 when action does not exist', () => {
      prismaService.taskAlert.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .delete('/planning/actions/invalid-uuid')
        .expect(404);
    });
  });

  describe('GET /planning/week', () => {
    it('should return week planning with tasks, actions and stats', () => {
      prismaService.task.findMany.mockResolvedValue([mockTask]);
      prismaService.taskAlert.findMany.mockResolvedValue([mockAlert]);

      return request(app.getHttpServer())
        .get('/planning/week?startDate=2026-03-10&endDate=2026-03-16')
        .expect(200)
        .expect(
          (res: {
            body: {
              tasks: any[];
              actions: any[];
              stats: {
                tasksThisWeek: any;
                tasksLate: any;
                tasksWeatherRisk: any;
              };
            };
          }) => {
            expect(res.body).toHaveProperty('tasks');
            expect(res.body).toHaveProperty('actions');
            expect(res.body).toHaveProperty('stats');
            expect(res.body.stats).toHaveProperty('tasksThisWeek');
            expect(res.body.stats).toHaveProperty('tasksLate');
            expect(res.body.stats).toHaveProperty('tasksWeatherRisk');
          },
        );
    });
  });
});
