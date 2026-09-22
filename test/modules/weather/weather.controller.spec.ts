import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from '../../../src/modules/weather/weather.controller';
import { WeatherService } from '../../../src/modules/weather/weather.service';
import { SiteService } from '../../../src/modules/sites/site.service';
import { HttpException } from '@nestjs/common';

describe('WeatherController', () => {
  let controller: WeatherController;
  const mockRequest = { user: { organizationId: 'org-a' } } as any;

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
    findOne: jest.fn(),
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

  describe('getWeatherBySite', () => {
    it('devrait retourner les prévisions météo pour un site valide', async () => {
      const mockSite = {
        id: 'site-123',
        organizationId: 'org-456',
        name: 'Chantier Paris 12',
        address: '12 rue de la Paix',
        city: 'Paris',
        postalCode: '75012',
        startDate: new Date('2026-01-01'),
        endDate: null,
        status: 'EN_COURS',
        budget: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSiteService.findOne.mockResolvedValue(mockSite);
      mockWeatherService.getWeatherByCity.mockResolvedValue(
        mockWeatherForecast,
      );

      const result = await controller.getWeatherBySite('site-123', mockRequest);

      expect(result).toEqual(mockWeatherForecast);
      expect(mockSiteService.findOne).toHaveBeenCalledWith('site-123', 'org-a');
      expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith('Paris');
    });

    it("devrait lever une exception si le site n'a pas de ville", async () => {
      const mockSiteWithoutCity = {
        id: 'site-123',
        organizationId: 'org-456',
        name: 'Chantier Sans Ville',
        address: '12 rue de la Paix',
        city: null,
        postalCode: '75012',
        startDate: new Date('2026-01-01'),
        endDate: null,
        status: 'EN_COURS',
        budget: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSiteService.findOne.mockResolvedValue(mockSiteWithoutCity);

      await expect(controller.getWeatherBySite('site-123', mockRequest)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.getWeatherBySite('site-123', mockRequest)).rejects.toThrow(
        'Le site ne possède pas de ville',
      );
    });

    it("devrait propager l'exception NotFoundException si le site n'existe pas", async () => {
      mockSiteService.findOne.mockRejectedValue(
        new HttpException('Site site-999 introuvable', 404),
      );

      await expect(controller.getWeatherBySite('site-999', mockRequest)).rejects.toThrow(
        HttpException,
      );
      expect(mockSiteService.findOne).toHaveBeenCalledWith('site-999', 'org-a');
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
