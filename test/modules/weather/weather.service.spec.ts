import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { WeatherService } from '../../../src/modules/weather/weather.service';
import { of } from 'rxjs';
import { HttpException } from '@nestjs/common';

describe('WeatherService', () => {
  let service: WeatherService;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCoordinatesFromCity', () => {
    it('devrait retourner les coordonnées pour une ville valide', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              latitude: 48.8566,
              longitude: 2.3522,
              name: 'Paris',
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getCoordinatesFromCity('Paris');

      expect(result).toEqual({
        latitude: 48.8566,
        longitude: 2.3522,
      });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('geocoding-api.open-meteo.com'),
        expect.any(Object),
      );
    });

    it("devrait lever une exception si la ville n'est pas trouvée", async () => {
      const mockResponse = {
        data: {
          results: [],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(
        service.getCoordinatesFromCity('VilleInexistante'),
      ).rejects.toThrow(HttpException);
    });

    it('devrait utiliser le cache pour la même ville', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              latitude: 48.8566,
              longitude: 2.3522,
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Premier appel
      await service.getCoordinatesFromCity('Paris');

      // Deuxième appel (devrait utiliser le cache)
      await service.getCoordinatesFromCity('Paris');

      // L'API ne devrait être appelée qu'une seule fois
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWeatherForecast', () => {
    it('devrait retourner les prévisions météo complètes', async () => {
      const mockResponse = {
        data: {
          latitude: 48.8566,
          longitude: 2.3522,
          timezone: 'Europe/Paris',
          current: {
            time: '2026-03-06T12:00',
            temperature_2m: 15.5,
            apparent_temperature: 14.2,
            relative_humidity_2m: 65,
            precipitation: 0,
            weather_code: 2,
            wind_speed_10m: 12.5,
            wind_direction_10m: 180,
          },
          daily: {
            time: ['2026-03-06', '2026-03-07'],
            weather_code: [2, 3],
            temperature_2m_max: [16.5, 17.0],
            temperature_2m_min: [10.0, 11.0],
            precipitation_sum: [0, 2.5],
            precipitation_probability_max: [10, 40],
            wind_speed_10m_max: [15.0, 18.0],
            sunrise: ['2026-03-06T07:00', '2026-03-07T07:00'],
            sunset: ['2026-03-06T18:30', '2026-03-07T18:31'],
          },
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getWeatherForecast(48.8566, 2.3522);

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('daily');
      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(result.current.temperature).toBe(15.5);
      expect(result.daily).toHaveLength(2);
    });

    it('devrait formater correctement les données météo', async () => {
      const mockResponse = {
        data: {
          latitude: 48.8566,
          longitude: 2.3522,
          timezone: 'Europe/Paris',
          current: {
            time: '2026-03-06T12:00',
            temperature_2m: 20.0,
            apparent_temperature: 19.0,
            relative_humidity_2m: 70,
            precipitation: 1.5,
            weather_code: 61,
            wind_speed_10m: 10.0,
            wind_direction_10m: 90,
          },
          daily: {
            time: ['2026-03-06'],
            weather_code: [61],
            temperature_2m_max: [22.0],
            temperature_2m_min: [15.0],
            precipitation_sum: [5.0],
            precipitation_probability_max: [60],
            wind_speed_10m_max: [20.0],
            sunrise: ['2026-03-06T07:00'],
            sunset: ['2026-03-06T18:30'],
          },
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getWeatherForecast(48.8566, 2.3522);

      expect(result.current.weatherDescription).toBe('Pluie légère');
      expect(result.daily[0].weatherDescription).toBe('Pluie légère');
    });

    it('devrait utiliser le cache pour les mêmes coordonnées', async () => {
      const mockResponse = {
        data: {
          latitude: 48.8566,
          longitude: 2.3522,
          timezone: 'Europe/Paris',
          current: {
            time: '2026-03-06T12:00',
            temperature_2m: 15,
            apparent_temperature: 14,
            relative_humidity_2m: 65,
            precipitation: 0,
            weather_code: 0,
            wind_speed_10m: 10,
            wind_direction_10m: 180,
          },
          daily: {
            time: ['2026-03-06'],
            weather_code: [0],
            temperature_2m_max: [18],
            temperature_2m_min: [12],
            precipitation_sum: [0],
            precipitation_probability_max: [0],
            wind_speed_10m_max: [15],
            sunrise: ['2026-03-06T07:00'],
            sunset: ['2026-03-06T18:30'],
          },
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Premier appel
      await service.getWeatherForecast(48.8566, 2.3522);

      // Deuxième appel (avec cache)
      await service.getWeatherForecast(48.8566, 2.3522);

      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWeatherByCity', () => {
    it('devrait combiner géocodage et météo', async () => {
      const mockGeocodingResponse = {
        data: {
          results: [
            {
              latitude: 48.8566,
              longitude: 2.3522,
            },
          ],
        },
      };

      const mockWeatherResponse = {
        data: {
          latitude: 48.8566,
          longitude: 2.3522,
          timezone: 'Europe/Paris',
          current: {
            time: '2026-03-06T12:00',
            temperature_2m: 18,
            apparent_temperature: 17,
            relative_humidity_2m: 60,
            precipitation: 0,
            weather_code: 1,
            wind_speed_10m: 8,
            wind_direction_10m: 220,
          },
          daily: {
            time: ['2026-03-06'],
            weather_code: [1],
            temperature_2m_max: [20],
            temperature_2m_min: [14],
            precipitation_sum: [0],
            precipitation_probability_max: [5],
            wind_speed_10m_max: [12],
            sunrise: ['2026-03-06T07:00'],
            sunset: ['2026-03-06T18:30'],
          },
        },
      };

      mockHttpService.get
        .mockReturnValueOnce(of(mockGeocodingResponse))
        .mockReturnValueOnce(of(mockWeatherResponse));

      const result = await service.getWeatherByCity('Paris');

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('daily');
      expect(result.latitude).toBe(48.8566);
    });
  });

  describe('getWeatherDescription', () => {
    it('devrait retourner des descriptions correctes pour les codes météo', () => {
      const testCases = [
        { code: 0, expected: 'Ciel dégagé' },
        { code: 61, expected: 'Pluie légère' },
        { code: 71, expected: 'Neige légère' },
        { code: 95, expected: 'Orage' },
        { code: 999, expected: 'Conditions inconnues' },
      ];

      testCases.forEach(({ code, expected }) => {
        const result = service['getWeatherDescription'](code);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Cache management', () => {
    it('devrait nettoyer le cache expiré', () => {
      const cacheKey = 'test_key';
      service['setCache'](cacheKey, { data: 'test' });

      // Simuler l'expiration en modifiant le timestamp
      const cached = service['cache'].get(cacheKey);
      if (cached) {
        cached.timestamp = Date.now() - 31 * 60 * 1000; // 31 minutes ago
      }

      service.clearExpiredCache();

      const result = service['getFromCache'](cacheKey);
      expect(result).toBeNull();
    });

    it('ne devrait pas supprimer le cache valide', () => {
      const cacheKey = 'test_key';
      const testData = { data: 'test' };
      service['setCache'](cacheKey, testData);

      service.clearExpiredCache();

      const result = service['getFromCache'](cacheKey);
      expect(result).toEqual(testData);
    });
  });
});
