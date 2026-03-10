import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlanningService } from '../../../src/modules/planning/planning.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
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
  task: mockTask,
};

describe('PlanningService', () => {
  let service: PlanningService;
  let prisma: {
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
  };

  beforeEach(async () => {
    prisma = {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
  });

  describe('findAll()', () => {
    it('should return all planning tasks', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);

      const result: any[] = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('status');
    });

    it('should filter tasks by date range', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findAll('2026-03-10', '2026-03-16');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            plannedEnd: {
              gte: new Date('2026-03-10'),
              lte: new Date('2026-03-16'),
            },
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter tasks by siteZoneId', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);

      await service.findAll(undefined, undefined, 'zone-uuid-1');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            siteZoneId: 'zone-uuid-1',
          }),
        }),
      );
    });

    it('should filter tasks by status', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);

      await service.findAll(
        undefined,
        undefined,
        undefined,
        TaskStatus.EN_COURS,
      );

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: TaskStatus.EN_COURS,
          }),
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('should return a task by id', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await service.findOne('task-uuid-1');

      expect(result).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(result.id).toBe('task-uuid-1');
      expect(prisma.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-uuid-1' },
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create()', () => {
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

    it('should create a new task', async () => {
      prisma.siteZone.findUnique.mockResolvedValue(mockSiteZone);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.task.create.mockResolvedValue(mockTask);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await service.create(createDto);

      expect(result).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(result.id).toBe('task-uuid-1');
      expect(prisma.task.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when siteZone does not exist', async () => {
      prisma.siteZone.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.siteZone.findUnique.mockResolvedValue(mockSiteZone);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    const updateDto = {
      name: 'Tâche mise à jour',
      status: TaskStatus.TERMINEE,
    };

    it('should update a task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({ ...mockTask, ...updateDto });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await service.update('task-uuid-1', updateDto);

      expect(result).toBeDefined();
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-uuid-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining(updateDto),
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove()', () => {
    it('should delete a task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.delete.mockResolvedValue(mockTask);

      const result = await service.remove('task-uuid-1');

      expect(result).toBeDefined();
      expect(result.message).toContain('supprimée avec succès');
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActions()', () => {
    it('should return all actions', async () => {
      prisma.taskAlert.findMany.mockResolvedValue([mockAlert]);

      const result = await service.findActions();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('icon');
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('badge');
    });

    it('should only return unread high priority alerts', async () => {
      prisma.taskAlert.findMany.mockResolvedValue([mockAlert]);

      await service.findActions();

      expect(prisma.taskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            isRead: false,
            severity: {
              in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
            },
          }),
        }),
      );
    });
  });

  describe('getWeekPlanning()', () => {
    it('should return week planning with tasks, actions and stats', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);
      prisma.taskAlert.findMany.mockResolvedValue([mockAlert]);

      const result = await service.getWeekPlanning('2026-03-10', '2026-03-16');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('tasksThisWeek');
      expect(result.stats).toHaveProperty('tasksLate');
      expect(result.stats).toHaveProperty('tasksWeatherRisk');
    });
  });

  describe('findTaskActions()', () => {
    it('should return actions for a specific task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.taskAlert.findMany.mockResolvedValue([mockAlert]);

      const result = await service.findTaskActions('task-uuid-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(prisma.taskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            taskId: 'task-uuid-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findTaskActions('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeAction()', () => {
    it('should mark an alert as read', async () => {
      prisma.taskAlert.findUnique.mockResolvedValue(mockAlert);
      prisma.taskAlert.update.mockResolvedValue({
        ...mockAlert,
        isRead: true,
      });

      const result = await service.removeAction('alert-uuid-1');

      expect(result).toBeDefined();
      expect(result.message).toContain('marquée comme lue');
      expect(prisma.taskAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-uuid-1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      prisma.taskAlert.findUnique.mockResolvedValue(null);

      await expect(service.removeAction('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
