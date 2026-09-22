import { TeamService } from '../../../src/modules/teams/team.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('TeamService', () => {
  let service: TeamService;
  let teamFindMany: jest.Mock;
  let attendanceFindMany: jest.Mock;

  beforeEach(() => {
    teamFindMany = jest.fn().mockResolvedValue([{ id: 'team-1' }]);
    attendanceFindMany = jest.fn();

    service = new TeamService({
      team: { findMany: teamFindMany },
      attendance: { findMany: attendanceFindMany },
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

    const result = await service.getTeamStats('site-1');

    expect(result.enCours).toBe(2);
    expect(result.retards).toBe(1);
    expect(result.pctEnCours).toBe(40);
  });

  it('returns zero pctEnCours when there are no attendances', async () => {
    attendanceFindMany.mockResolvedValue([]);

    const result = await service.getTeamStats('site-1');

    expect(result.enCours).toBe(0);
    expect(result.pctEnCours).toBe(0);
  });
});