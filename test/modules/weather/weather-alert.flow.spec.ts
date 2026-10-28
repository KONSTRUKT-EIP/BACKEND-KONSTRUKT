import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import {
  AlertSeverity,
  AlertType,
  SiteStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
// prettier-ignore
import { PlanningService } from
  '../../../src/modules/planning/planning.service';
import { WeatherService } from '../../../src/modules/weather/weather.service';
// prettier-ignore
import { WeatherAlertService } from
  '../../../src/modules/weather/weather-alert.service';
import {
  GeocodingResponse,
  WeatherApiResponse,
} from '../../../src/modules/weather/interfaces/open-meteo-api.interface';

interface FakeSite {
  id: string;
  organizationId: string;
  city: string;
  status: SiteStatus;
}

interface FakeZone {
  id: string;
  siteId: string;
  name: string;
}

interface FakeTask {
  id: string;
  siteZoneId: string;
  name: string;
  plannedEnd: Date;
  status: TaskStatus;
  time: string | null;
}

interface FakeAlert {
  id: string;
  taskId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface FakeDb {
  sites: FakeSite[];
  zones: FakeZone[];
  tasks: FakeTask[];
  alerts: FakeAlert[];
}

interface TaskWhere {
  siteZone?: { siteId?: string; site?: { organizationId: string } };
  status?: { in: TaskStatus[] };
  plannedEnd?: { gte: Date; lt?: Date; lte?: Date };
}

interface FindManyArgs<TWhere> {
  where: TWhere;
  include?: unknown;
}

interface AlertWhere {
  taskId?: string;
  type?: AlertType;
  message?: string;
  severity?: { in: AlertSeverity[] };
  task?: TaskWhere;
}

const STORM_DAY = '2026-10-30';

const BOGOR_GEOCODING: GeocodingResponse = {
  results: [
    { latitude: -6.59, longitude: 106.8, name: 'Bogor', country: 'Indonésie' },
  ],
};

const BOGOR_FORECAST: WeatherApiResponse = {
  latitude: -6.59,
  longitude: 106.8,
  timezone: 'Asia/Jakarta',
  timezone_abbreviation: 'WIB',
  elevation: 265,
  current: {
    time: '2026-10-28T10:00',
    temperature_2m: 29,
    apparent_temperature: 33,
    relative_humidity_2m: 80,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 8,
    wind_direction_10m: 180,
  },
  daily: {
    time: ['2026-10-29', STORM_DAY, '2026-10-31'],
    weather_code: [2, 95, 2],
    temperature_2m_max: [31, 30, 31],
    temperature_2m_min: [23, 23, 23],
    precipitation_sum: [4, 12, 3],
    precipitation_probability_max: [40, 90, 30],
    wind_speed_10m_max: [10, 18, 9],
    sunrise: ['05:30', '05:30', '05:30'],
    sunset: ['17:50', '17:50', '17:50'],
  },
};

function octoberDay(date: number): Date {
  return new Date(2026, 9, date, 16, 0);
}

function buildDb(): FakeDb {
  return {
    sites: [
      {
        id: 'site-bogor',
        organizationId: 'org-1',
        city: 'Bogor',
        status: SiteStatus.EN_COURS,
      },
      {
        id: 'site-closed',
        organizationId: 'org-1',
        city: 'Bogor',
        status: SiteStatus.TERMINE,
      },
    ],
    zones: [
      { id: 'zone-a', siteId: 'site-bogor', name: 'Bâtiment A' },
      { id: 'zone-old', siteId: 'site-closed', name: 'Ancien bâtiment' },
    ],
    tasks: [
      {
        id: 'task-storm',
        siteZoneId: 'zone-a',
        name: 'Coulage dalle',
        plannedEnd: octoberDay(30),
        status: TaskStatus.EN_COURS,
        time: '08:00',
      },
      {
        id: 'task-calm',
        siteZoneId: 'zone-a',
        name: 'Pose fenêtres',
        plannedEnd: octoberDay(31),
        status: TaskStatus.EN_ATTENTE,
        time: null,
      },
      {
        id: 'task-done',
        siteZoneId: 'zone-a',
        name: 'Terrassement',
        plannedEnd: octoberDay(30),
        status: TaskStatus.TERMINEE,
        time: null,
      },
      {
        id: 'task-closed-site',
        siteZoneId: 'zone-old',
        name: 'Démolition',
        plannedEnd: octoberDay(30),
        status: TaskStatus.EN_COURS,
        time: null,
      },
    ],
    alerts: [],
  };
}

function siteOfTask(db: FakeDb, task: FakeTask): FakeSite | undefined {
  const zone = db.zones.find((item) => item.id === task.siteZoneId);
  return db.sites.find((item) => item.id === zone?.siteId);
}

function matchesTask(db: FakeDb, task: FakeTask, where: TaskWhere): boolean {
  const site = siteOfTask(db, task);
  const range = where.plannedEnd;
  const time = task.plannedEnd.getTime();
  const orgId = where.siteZone?.site?.organizationId;

  return (
    (!where.siteZone?.siteId || site?.id === where.siteZone.siteId) &&
    (!orgId || site?.organizationId === orgId) &&
    (!where.status || where.status.in.includes(task.status)) &&
    (!range || time >= range.gte.getTime()) &&
    (!range?.lt || time < range.lt.getTime()) &&
    (!range?.lte || time <= range.lte.getTime())
  );
}

function withRelations(db: FakeDb, task: FakeTask) {
  return {
    ...task,
    siteZone: db.zones.find((zone) => zone.id === task.siteZoneId),
    assignments: [],
    alerts: db.alerts.filter(
      (alert) => alert.taskId === task.id && !alert.isRead,
    ),
  };
}

function findTasks(db: FakeDb, args: FindManyArgs<TaskWhere>) {
  const tasks = db.tasks.filter((task) => matchesTask(db, task, args.where));
  return args.include
    ? tasks.map((task) => withRelations(db, task))
    : tasks.map((task) => ({ id: task.id }));
}

function matchesAlert(db: FakeDb, alert: FakeAlert, where: AlertWhere) {
  const task = db.tasks.find((item) => item.id === alert.taskId);

  return (
    task !== undefined &&
    (!where.taskId || alert.taskId === where.taskId) &&
    (!where.type || alert.type === where.type) &&
    (!where.message || alert.message === where.message) &&
    (!where.severity || where.severity.in.includes(alert.severity)) &&
    (!where.task || matchesTask(db, task, where.task))
  );
}

function createAlert(db: FakeDb, data: Partial<FakeAlert>): FakeAlert {
  const alert = {
    id: `alert-${db.alerts.length + 1}`,
    isRead: false,
    createdAt: new Date(),
    ...data,
  } as FakeAlert;
  db.alerts.push(alert);
  return alert;
}

function buildFakePrisma(db: FakeDb) {
  return {
    site: {
      findMany: jest.fn(
        (args: FindManyArgs<{ status: { in: SiteStatus[] } }>) =>
          Promise.resolve(
            db.sites.filter((site) =>
              args.where.status.in.includes(site.status),
            ),
          ),
      ),
    },
    task: {
      findMany: jest.fn((args: FindManyArgs<TaskWhere>) =>
        Promise.resolve(findTasks(db, args)),
      ),
    },
    taskAlert: {
      findFirst: jest.fn((args: FindManyArgs<AlertWhere>) =>
        Promise.resolve(
          db.alerts.find((alert) => matchesAlert(db, alert, args.where)) ??
            null,
        ),
      ),
      findMany: jest.fn((args: FindManyArgs<AlertWhere>) =>
        Promise.resolve(
          db.alerts
            .filter(
              (alert) => !alert.isRead && matchesAlert(db, alert, args.where),
            )
            .map((alert) => {
              const task = db.tasks.find((item) => item.id === alert.taskId);
              return { ...alert, task: task && withRelations(db, task) };
            }),
        ),
      ),
      create: jest.fn((args: { data: Partial<FakeAlert> }) =>
        Promise.resolve(createAlert(db, args.data)),
      ),
    },
  };
}

describe('Alertes météo de bout en bout (chantier à Bogor)', () => {
  let db: FakeDb;
  let alertService: WeatherAlertService;
  let planningService: PlanningService;

  const mockHttpService = {
    get: jest.fn((url: string) =>
      of({
        data: url.includes('geocoding') ? BOGOR_GEOCODING : BOGOR_FORECAST,
      }),
    ),
  };

  beforeEach(async () => {
    db = buildDb();
    const module = await Test.createTestingModule({
      providers: [
        WeatherService,
        WeatherAlertService,
        PlanningService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: buildFakePrisma(db) },
      ],
    }).compile();

    alertService = module.get(WeatherAlertService);
    planningService = module.get(PlanningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('alerte en CRITICAL la seule tâche ouverte du jour d’orage', async () => {
    const created = await alertService.checkWeatherAlerts();

    expect(created).toBe(1);
    expect(db.alerts).toEqual([
      expect.objectContaining({
        taskId: 'task-storm',
        type: AlertType.AUTRE,
        severity: AlertSeverity.CRITICAL,
        message: 'Alerte météo le 30/10/2026 : orage',
        isRead: false,
      }),
    ]);
  });

  it('affiche l’alerte dans le planning de la semaine', async () => {
    await alertService.checkWeatherAlerts();

    const week = await planningService.getWeekPlanning(
      '2026-10-26',
      '2026-11-01',
      'org-1',
    );

    const storm = week.tasks.find((task) => task.id === 'task-storm');
    const calm = week.tasks.find((task) => task.id === 'task-calm');
    expect(storm?.status).toBe('weather-risk');
    expect(calm?.status).not.toBe('weather-risk');
    expect(week.stats.tasksWeatherRisk).toBe(1);
    expect(week.actions).toEqual([
      expect.objectContaining({
        icon: '🌧️',
        badge: 'À décaler',
        label: 'Coulage dalle',
        sublabel: 'Bâtiment A',
      }),
    ]);
  });

  it('ne duplique pas l’alerte au passage suivant', async () => {
    await alertService.checkWeatherAlerts();
    const createdAgain = await alertService.checkWeatherAlerts();

    expect(createdAgain).toBe(0);
    expect(db.alerts).toHaveLength(1);
  });

  it('ne montre pas l’alerte à une autre organisation', async () => {
    await alertService.checkWeatherAlerts();

    const week = await planningService.getWeekPlanning(
      '2026-10-26',
      '2026-11-01',
      'org-2',
    );

    expect(week.tasks).toEqual([]);
    expect(week.actions).toEqual([]);
  });
});
