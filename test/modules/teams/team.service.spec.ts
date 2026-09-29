import { TeamService } from '../../../src/modules/teams/team.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('TeamService', () => {
  let service: TeamService;
  let teamFindMany: jest.Mock;
  let teamMemberFindFirst: jest.Mock;
  let siteFindFirst: jest.Mock;
  let attendanceFindMany: jest.Mock;
  let attendanceUpsert: jest.Mock;

  beforeEach(() => {
    teamFindMany = jest.fn().mockResolvedValue([{ id: 'team-1' }]);
    teamMemberFindFirst = jest.fn();
    siteFindFirst = jest.fn();
    attendanceFindMany = jest.fn();
    attendanceUpsert = jest.fn();

    service = new TeamService({
      team: { findMany: teamFindMany },
      teamMember: { findFirst: teamMemberFindFirst },
      site: { findFirst: siteFindFirst },
      attendance: {
        findMany: attendanceFindMany,
        upsert: attendanceUpsert,
      },
    } as unknown as PrismaService);
  });

  it('calculates pctEnCours from present workers without checkout', async () => {
    siteFindFirst.mockResolvedValue({ id: 'site-1' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    attendanceFindMany.mockResolvedValue([
      {
        date: today,
        status: 'PRESENT',
        checkOut: null,
      },
      {
        date: today,
        status: 'PRESENT',
        checkOut: null,
      },
      {
        date: today,
        status: 'PRESENT',
        checkOut: new Date(),
      },
      {
        date: today,
        status: 'RETARD',
        checkOut: null,
      },
      {
        date: today,
        status: 'ABSENT',
        checkOut: null,
      },
    ]);

    const result = await service.getTeamStats('site-1', 'org-1');

    expect(result.enCours).toBe(2);
    expect(result.retards).toBe(1);
    expect(result.pctEnCours).toBe(40);
  });

  it('returns zero pctEnCours when there are no attendances', async () => {
    siteFindFirst.mockResolvedValue({ id: 'site-1' });
    attendanceFindMany.mockResolvedValue([]);

    const result = await service.getTeamStats('site-1', 'org-1');

    expect(result.enCours).toBe(0);
    expect(result.pctEnCours).toBe(0);
  });

  it('persists normal and overtime hours for a site team member', async () => {
    siteFindFirst.mockResolvedValue({ id: 'site-1' });
    teamMemberFindFirst.mockResolvedValue({ teamId: 'team-1' });
    attendanceUpsert.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-1',
      normalHours: 8,
      overtimeHours: 1.5,
    });

    const dto = {
      teamId: 'team-1',
      userId: 'user-1',
      date: '2026-09-29',
      normalHours: 8,
      overtimeHours: 1.5,
    };

    await service.upsertWorkforceHours('site-1', dto, 'org-1');

    expect(attendanceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teamId_userId_date: {
            teamId: 'team-1',
            userId: 'user-1',
            date: new Date('2026-09-29T00:00:00.000Z'),
          },
        },
        update: { normalHours: 8, overtimeHours: 1.5 },
        create: expect.objectContaining({
          status: 'PRESENT',
          normalHours: 8,
          overtimeHours: 1.5,
        }),
      }),
    );
  });
});
