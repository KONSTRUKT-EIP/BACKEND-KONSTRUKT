import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertSeverity, AlertType } from '@prisma/client';
import { TaskAlertService } from '../../../src/modules/planning/task-alert.service';
import { TaskDelayAlertService } from '../../../src/modules/planning/task-delay-alert.service';

function createPrisma() {
  return {
    task: { findMany: jest.fn() },
    taskAlert: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

const orgScope = { site: { organizationId: 'org-1' } };

describe('TaskAlertService', () => {
  it('requires an organization context', async () => {
    const service = new TaskAlertService(createPrisma() as never);
    await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
  });

  it('filters alerts by organization, site, type, severity and read state', async () => {
    const prisma = createPrisma();
    const service = new TaskAlertService(prisma as never);

    await service.findAll(
      {
        siteId: 'site-1',
        type: AlertType.RETARD,
        severity: AlertSeverity.HIGH,
        isRead: false,
        page: 2,
        pageSize: 10,
      },
      'org-1',
    );

    expect(prisma.taskAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          task: { siteZone: { ...orgScope, siteId: 'site-1' } },
          type: AlertType.RETARD,
          severity: AlertSeverity.HIGH,
          isRead: false,
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('does not mark an alert of another organization as read', async () => {
    const prisma = createPrisma();
    prisma.taskAlert.findFirst.mockResolvedValue(null);
    const service = new TaskAlertService(prisma as never);

    await expect(service.markAsRead('alert-1', 'org-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.taskAlert.update).not.toHaveBeenCalled();
  });

  it('marks every unread alert of the organization as read', async () => {
    const prisma = createPrisma();
    const service = new TaskAlertService(prisma as never);

    await expect(service.markAllAsRead('org-1')).resolves.toEqual({
      updated: 3,
    });
    expect(prisma.taskAlert.updateMany).toHaveBeenCalledWith({
      where: { task: { siteZone: orgScope }, isRead: false },
      data: { isRead: true },
    });
  });
});

describe('TaskDelayAlertService', () => {
  it('creates a RETARD alert for each overdue open task', async () => {
    const prisma = createPrisma();
    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        name: 'Coulage dalle',
        plannedEnd: new Date('2026-11-01'),
      },
    ]);
    const service = new TaskDelayAlertService(prisma as never);
    const now = new Date('2026-11-05');

    await expect(service.checkDelayedTasks(now)).resolves.toBe(1);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plannedEnd: { lt: now },
          realEnd: null,
          alerts: { none: { type: AlertType.RETARD, isRead: false } },
        }),
      }),
    );
    expect(prisma.taskAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 'task-1',
        type: AlertType.RETARD,
        severity: AlertSeverity.HIGH,
      }),
    });
  });
});
