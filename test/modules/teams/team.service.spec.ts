import { TeamService } from '../../../src/modules/teams/team.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('TeamService', () => {
  let service: TeamService;
  let teamFindMany: jest.Mock;
  let attendanceFindMany: jest.Mock;
  let siteFindFirst: jest.Mock;
  let teamMemberFindMany: jest.Mock;

  beforeEach(() => {
    teamFindMany = jest.fn().mockResolvedValue([{ id: 'team-1' }]);
    attendanceFindMany = jest.fn();
    siteFindFirst = jest.fn().mockResolvedValue({
      id: 'site-1',
      organizationId: 'org-a',
    });

    teamMemberFindMany = jest.fn().mockResolvedValue([]);

    service = new TeamService({
      team: { findMany: teamFindMany },
      teamMember: { findMany: teamMemberFindMany },
      attendance: { findMany: attendanceFindMany },
      site: { findFirst: siteFindFirst },
    } as unknown as PrismaService);
  });

  it('calculates pctEnCours from present workers without checkout', async () => {
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

    const result = await service.getTeamStats('site-1', 'org-a');

    expect(result.enCours).toBe(2);
    expect(result.retards).toBe(1);
    expect(result.pctEnCours).toBe(40);
  });

  it('returns zero pctEnCours when there are no attendances', async () => {
    attendanceFindMany.mockResolvedValue([]);

    const result = await service.getTeamStats('site-1', 'org-a');

    expect(result.enCours).toBe(0);
    expect(result.pctEnCours).toBe(0);
  });

  it('counts every worker without attendance as pending', async () => {
    teamMemberFindMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' },
      { userId: 'u4' },
    ]);
    attendanceFindMany.mockResolvedValue([]);

    const result = await service.getTeamStats('site-1', 'org-a');

    expect(result.totalEmployees).toBe(4);
    expect(result.enAttente).toBe(4);
    expect(result.complete).toBe(0);
  });

  it('excludes workers who already have an attendance from pending', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    teamMemberFindMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u2' },
      { userId: 'u3' },
    ]);
    attendanceFindMany.mockResolvedValue([
      { userId: 'u1', date: today, status: 'PRESENT', checkOut: null },
    ]);

    const result = await service.getTeamStats('site-1', 'org-a');

    expect(result.totalEmployees).toBe(3);
    expect(result.enAttente).toBe(2);
    expect(result.complete).toBe(1);
  });
});
