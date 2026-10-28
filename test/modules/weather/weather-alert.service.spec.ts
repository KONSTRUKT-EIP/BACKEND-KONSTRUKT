import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AlertSeverity,
  AlertType,
  SiteStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
// prettier-ignore
import { WeatherAlertService } from
  '../../../src/modules/weather/weather-alert.service';
import { WeatherService } from '../../../src/modules/weather/weather.service';
import {
  DailyWeatherDto,
  WeatherForecastDto,
} from '../../../src/modules/weather/dto';

function buildDay(overrides: Partial<DailyWeatherDto>): DailyWeatherDto {
  return {
    date: '2026-11-03',
    temperatureMax: 15,
    temperatureMin: 5,
    precipitation: 0,
    precipitationProbability: 0,
    windSpeedMax: 10,
    weatherCode: 1,
    weatherDescription: 'Principalement dégagé',
    sunrise: '2026-11-03T07:30',
    sunset: '2026-11-03T17:20',
    ...overrides,
  };
}

function buildForecast(daily: DailyWeatherDto[]): WeatherForecastDto {
  return {
    latitude: 48.85,
    longitude: 2.35,
    timezone: 'Europe/Paris',
    current: {} as WeatherForecastDto['current'],
    daily,
  };
}

describe('WeatherAlertService', () => {
  let service: WeatherAlertService;

  const mockPrisma = {
    site: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    taskAlert: { findFirst: jest.fn(), create: jest.fn() },
  };
  const mockWeatherService = { getWeatherByCity: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherAlertService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WeatherService, useValue: mockWeatherService },
      ],
    }).compile();

    service = module.get<WeatherAlertService>(WeatherAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSite', () => {
    it('crée une alerte sur les tâches ouvertes du jour à risque', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        buildForecast([
          buildDay({ date: '2026-11-02' }),
          buildDay({ date: '2026-11-03', windSpeedMax: 55 }),
        ]),
      );
      mockPrisma.task.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      mockPrisma.taskAlert.findFirst.mockResolvedValue(null);

      const created = await service.checkSite('site-1', 'Paris');

      expect(created).toBe(2);
      expect(mockPrisma.task.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          siteZone: { siteId: 'site-1' },
          status: {
            in: [
              TaskStatus.EN_ATTENTE,
              TaskStatus.EN_COURS,
              TaskStatus.EN_PAUSE,
            ],
          },
          plannedEnd: {
            gte: new Date(2026, 10, 3),
            lt: new Date(2026, 10, 4),
          },
        },
        select: { id: true },
      });
      expect(mockPrisma.taskAlert.create).toHaveBeenCalledWith({
        data: {
          taskId: 't1',
          type: AlertType.AUTRE,
          severity: AlertSeverity.HIGH,
          message: 'Alerte météo le 03/11/2026 : vent fort (55 km/h)',
        },
      });
    });

    it('ne recrée pas une alerte déjà existante', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        buildForecast([buildDay({ windSpeedMax: 55 })]),
      );
      mockPrisma.task.findMany.mockResolvedValue([{ id: 't1' }]);
      mockPrisma.taskAlert.findFirst.mockResolvedValue({ id: 'alert-1' });

      const created = await service.checkSite('site-1', 'Paris');

      expect(created).toBe(0);
      expect(mockPrisma.taskAlert.create).not.toHaveBeenCalled();
    });

    it('ignore un site dont la météo est indisponible', async () => {
      mockWeatherService.getWeatherByCity.mockRejectedValue(
        new HttpException('Ville non trouvée', HttpStatus.NOT_FOUND),
      );

      const created = await service.checkSite('site-1', 'Atlantide');

      expect(created).toBe(0);
      expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
    });
  });

  describe('checkWeatherAlerts', () => {
    it('vérifie uniquement les chantiers planifiés ou en cours', async () => {
      mockPrisma.site.findMany.mockResolvedValue([
        { id: 'site-1', city: 'Paris' },
        { id: 'site-2', city: 'Lyon' },
      ]);
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        buildForecast([buildDay({})]),
      );

      const created = await service.checkWeatherAlerts();

      expect(created).toBe(0);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: [SiteStatus.PLANIFIE, SiteStatus.EN_COURS] },
        },
        select: { id: true, city: true },
      });
      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledTimes(2);
    });
  });
});
