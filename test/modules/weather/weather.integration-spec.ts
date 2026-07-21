/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WeatherModule } from '../../../src/modules/weather/weather.module';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import {
  GeocodingResponse,
  WeatherApiResponse,
} from '../../../src/modules/weather/interfaces/open-meteo-api.interface';

describe('Weather Integration Tests', () => {
  let app: INestApplication;

  const mockGeocodingParis: GeocodingResponse = {
    results: [
      {
        latitude: 48.8566,
        longitude: 2.3522,
        name: 'Paris',
        country: 'France',
      },
    ],
  };

  const mockGeocodingMarseille: GeocodingResponse = {
    results: [
      {
        latitude: 43.2965,
        longitude: 5.3698,
        name: 'Marseille',
        country: 'France',
      },
    ],
  };

  const mockGeocodingLyon: GeocodingResponse = {
    results: [
      {
        latitude: 45.7597,
        longitude: 4.8422,
        name: 'Lyon',
        country: 'France',
      },
    ],
  };

  const mockGeocodingNotFound: GeocodingResponse = {
    results: [],
  };

  const mockWeatherData: WeatherApiResponse = {
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    timezone_abbreviation: 'CET',
    elevation: 42,
    current: {
      time: '2026-03-09T12:00',
      temperature_2m: 15.5,
      apparent_temperature: 14.2,
      relative_humidity_2m: 65,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 12.5,
      wind_direction_10m: 180,
    },
    daily: {
      time: [
        '2026-03-09',
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
        '2026-03-14',
        '2026-03-15',
      ],
      weather_code: [1, 2, 3, 61, 1, 2, 0],
      temperature_2m_max: [18.5, 19.2, 17.8, 16.5, 18.0, 20.1, 21.5],
      temperature_2m_min: [10.2, 11.0, 9.5, 8.3, 10.1, 12.3, 13.0],
      precipitation_sum: [0, 0.5, 1.2, 5.5, 0, 0.2, 0],
      precipitation_probability_max: [10, 20, 40, 80, 15, 25, 5],
      wind_speed_10m_max: [15.2, 18.5, 22.0, 25.3, 16.8, 14.2, 12.5],
      sunrise: [
        '2026-03-09T06:45',
        '2026-03-10T06:43',
        '2026-03-11T06:41',
        '2026-03-12T06:39',
        '2026-03-13T06:37',
        '2026-03-14T06:35',
        '2026-03-15T06:33',
      ],
      sunset: [
        '2026-03-09T18:30',
        '2026-03-10T18:32',
        '2026-03-11T18:34',
        '2026-03-12T18:36',
        '2026-03-13T18:38',
        '2026-03-14T18:40',
        '2026-03-15T18:42',
      ],
    },
  };

  const mockHttpService = {
    get: jest.fn((url: string, config?: any) => {
      if (url.includes('geocoding-api.open-meteo.com')) {
        const cityName = config?.params?.name;
        if (cityName === 'Paris') {
          return of({ data: mockGeocodingParis });
        } else if (cityName === 'Marseille') {
          return of({ data: mockGeocodingMarseille });
        } else if (cityName === 'Lyon') {
          return of({ data: mockGeocodingLyon });
        } else {
          return of({ data: mockGeocodingNotFound });
        }
      }
      if (url.includes('api.open-meteo.com/v1/forecast')) {
        const lat = config?.params?.latitude;
        if (lat === 43.2965 || Math.abs(lat - 43.2965) < 0.1) {
          return of({
            data: {
              ...mockWeatherData,
              latitude: 43.2965,
              longitude: 5.3698,
            },
          });
        }
        return of({ data: mockWeatherData });
      }
      return of({ data: {} });
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WeatherModule],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        site: { findFirst: jest.fn() },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /weather/forecast', () => {
    it('devrait retourner les prévisions météo avec des coordonnées GPS', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ latitude: 48.8566, longitude: 2.3522 })
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('daily');
      expect(response.body.current).toHaveProperty('temperature');
      expect(response.body.current).toHaveProperty('weatherDescription');
      expect(Array.isArray(response.body.daily)).toBe(true);
      expect(response.body.daily.length).toBeGreaterThan(0);
    });

    it('devrait retourner les prévisions météo avec un nom de ville', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Paris' })
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('daily');
      expect(response.body.latitude).toBeCloseTo(48.8566, 1);
      expect(response.body.longitude).toBeCloseTo(2.3522, 1);
    });

    it('devrait retourner 400 sans paramètres de localisation', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('devrait retourner 400 avec seulement la latitude', async () => {
      await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ latitude: 48.8566 })
        .expect(400);
    });
  });

  describe('GET /weather/current', () => {
    it('devrait retourner la météo actuelle uniquement', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/current')
        .query({ latitude: 48.8566, longitude: 2.3522 })
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).not.toHaveProperty('daily');
      expect(response.body.current).toHaveProperty('temperature');
      expect(response.body.current).toHaveProperty('humidity');
      expect(response.body.current).toHaveProperty('windSpeed');
    });
  });

  describe('GET /weather/city/:cityName', () => {
    it('devrait retourner les prévisions pour Paris', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/city/Paris')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('daily');
      expect(response.body.timezone).toBe('Europe/Paris');
    });

    it('devrait retourner les prévisions pour Marseille', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/city/Marseille')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body.latitude).toBeCloseTo(43.2965, 1);
    });

    it('devrait retourner 404 pour une ville inexistante', async () => {
      await request(app.getHttpServer())
        .get('/weather/city/VilleQuiNexistePas123456')
        .expect(404);
    });
  });

  describe('GET /weather/coordinates/:city', () => {
    it('devrait retourner les coordonnées de Paris', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/coordinates/Paris')
        .expect(200);

      expect(response.body).toHaveProperty('latitude');
      expect(response.body).toHaveProperty('longitude');
      expect(response.body.latitude).toBeCloseTo(48.8566, 1);
      expect(response.body.longitude).toBeCloseTo(2.3522, 1);
    });

    it('devrait retourner 404 pour une ville inexistante', async () => {
      await request(app.getHttpServer())
        .get('/weather/coordinates/VilleInexistante999')
        .expect(404);
    });
  });

  describe('Cache behavior', () => {
    it('devrait utiliser le cache pour des requêtes identiques', async () => {
      await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Lyon' })
        .expect(200);

      const callsAfterFirstRequest = mockHttpService.get.mock.calls.length;
      expect(callsAfterFirstRequest).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Lyon' })
        .expect(200);

      const callsAfterSecondRequest = mockHttpService.get.mock.calls.length;
      expect(callsAfterSecondRequest).toBe(callsAfterFirstRequest);
    });
  });

  describe('Data validation', () => {
    it('devrait valider que température est un nombre', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/current')
        .query({ latitude: 48.8566, longitude: 2.3522 })
        .expect(200);

      expect(typeof response.body.current.temperature).toBe('number');
      expect(typeof response.body.current.humidity).toBe('number');
      expect(typeof response.body.current.windSpeed).toBe('number');
    });

    it('devrait avoir des prévisions sur 7 jours', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Paris' })
        .expect(200);

      expect(response.body.daily.length).toBe(7);
    });

    it('devrait formater correctement les dates', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Paris' })
        .expect(200);

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      response.body.daily.forEach((day: any) => {
        expect(day.date).toMatch(dateRegex);
      });
    });

    it('devrait inclure les heures de lever/coucher de soleil', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Paris' })
        .expect(200);

      response.body.daily.forEach((day: any) => {
        expect(day).toHaveProperty('sunrise');
        expect(day).toHaveProperty('sunset');
        expect(typeof day.sunrise).toBe('string');
        expect(typeof day.sunset).toBe('string');
      });
    });
  });
});
