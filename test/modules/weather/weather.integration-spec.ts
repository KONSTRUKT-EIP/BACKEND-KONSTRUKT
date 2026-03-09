/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WeatherModule } from '../../../src/modules/weather/weather.module';
import { HttpModule } from '@nestjs/axios';

describe('Weather Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WeatherModule, HttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Lyon' })
        .expect(200);
      const duration1 = Date.now() - start1;

      // La deuxième requête devrait être plus rapide (cache)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/weather/forecast')
        .query({ city: 'Lyon' })
        .expect(200);
      const duration2 = Date.now() - start2;

      // Le cache devrait rendre la deuxième requête significativement plus rapide
      expect(duration2).toBeLessThan(duration1);
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
