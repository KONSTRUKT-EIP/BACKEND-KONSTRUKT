import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from '../../../src/modules/weather/weather.controller';
import { WeatherService } from '../../../src/modules/weather/weather.service';
import { SiteService } from '../../../src/modules/sites/site.service';
import { HttpException } from '@nestjs/common';

describe('WeatherController', () => {
  let controller: WeatherController;

  const mockWeatherService = {
    getWeatherForecast: jest.fn(),
    getWeatherByCity: jest.fn(),
    getCoordinatesFromCity: jest.fn(),
  };

  const mockWeatherForecast = {
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    current: {
      temperature: 15.5,
      feelsLike: 14.2,
      humidity: 65,
      windSpeed: 12.5,
      windDirection: 180,
      precipitation: 0,
      weatherCode: 2,
      weatherDescription: 'Partiellement nuageux',
      time: '2026-03-06T12:00',
    },
    daily: [
      {
        date: '2026-03-06',
        temperatureMax: 16.5,
        temperatureMin: 10.0,
        precipitation: 0,
        precipitationProbability: 10,
        windSpeedMax: 15.0,
        weatherCode: 2,
        weatherDescription: 'Partiellement nuageux',
        sunrise: '2026-03-06T07:00',
        sunset: '2026-03-06T18:30',
      },
    ],
  };

  const mockSiteService = {
    getSiteById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        {
          provide: WeatherService,
          useValue: mockWeatherService,
        },
        {
          provide: SiteService,
          useValue: mockSiteService,
        },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherForecast', () => {
    it('devrait retourner les prévisions avec des coordonnées GPS', async () => {
      mockWeatherService.getWeatherForecast.mockResolvedValue(
        mockWeatherForecast,
      );

      const result = await controller.getWeatherForecast({
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result).toEqual(mockWeatherForecast);
      expect(mockWeatherService.getWeatherForecast).toHaveBeenCalledWith(
        48.8566,
        2.3522,
      );
    });

    it('devrait retourner les prévisions avec une ville', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        mockWeatherForecast,
      );

      const result = await controller.getWeatherForecast({
        city: 'Paris',
      });

      expect(result).toEqual(mockWeatherForecast);
      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith('Paris');
    });

    it('devrait privilégier la ville sur les coordonnées si les deux sont fournis', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        mockWeatherForecast,
      );

      await controller.getWeatherForecast({
        latitude: 48.8566,
        longitude: 2.3522,
        city: 'Paris',
      });

      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith('Paris');
      expect(mockWeatherService.getWeatherForecast).not.toHaveBeenCalled();
    });

    it("devrait lever une exception si aucune localisation n'est fournie", async () => {
      await expect(controller.getWeatherForecast({})).rejects.toThrow(
        HttpException,
      );
    });

    it('devrait lever une exception si seulement la latitude est fournie', async () => {
      await expect(
        controller.getWeatherForecast({ latitude: 48.8566 }),
      ).rejects.toThrow(HttpException);
    });

    it('devrait lever une exception si seulement la longitude est fournie', async () => {
      await expect(
        controller.getWeatherForecast({ longitude: 2.3522 }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getCurrentWeather', () => {
    it('devrait retourner uniquement la météo actuelle', async () => {
      mockWeatherService.getWeatherForecast.mockResolvedValue(
        mockWeatherForecast,
      );

      const result = await controller.getCurrentWeather({
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result).toEqual({
        latitude: mockWeatherForecast.latitude,
        longitude: mockWeatherForecast.longitude,
        timezone: mockWeatherForecast.timezone,
        current: mockWeatherForecast.current,
      });
      expect(result).not.toHaveProperty('daily');
    });
  });

  describe('getWeatherByCity', () => {
    it('devrait retourner les prévisions pour une ville', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        mockWeatherForecast,
      );

      const result = await controller.getWeatherByCity('Paris');

      expect(result).toEqual(mockWeatherForecast);
      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith('Paris');
    });

    it('devrait gérer les noms de ville avec des espaces', async () => {
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        mockWeatherForecast,
      );

      await controller.getWeatherByCity('New York');

      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith(
        'New York',
      );
    });
  });

  describe('getCoordinates', () => {
    it("devrait retourner les coordonnées d'une ville", async () => {
      const mockCoordinates = {
        latitude: 48.8566,
        longitude: 2.3522,
      };

      mockWeatherService.getCoordinatesFromCity.mockResolvedValue(
        mockCoordinates,
      );

      const result = await controller.getCoordinates('Paris');

      expect(result).toEqual(mockCoordinates);
      expect(mockWeatherService.getCoordinatesFromCity).toHaveBeenCalledWith(
        'Paris',
      );
    });
  });
});
