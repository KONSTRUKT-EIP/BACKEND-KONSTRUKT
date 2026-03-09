import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WeatherForecastDto, CurrentWeatherDto, DailyWeatherDto } from './dto';
import {
  GeocodingResponse,
  WeatherApiResponse,
} from './interfaces/open-meteo-api.interface';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
  private readonly GEOCODING_BASE_URL =
    'https://geocoding-api.open-meteo.com/v1';

  // Cache simple en mémoire (pour production, utiliser Redis)
  private cache = new Map<
    string,
    {
      data: WeatherForecastDto | { latitude: number; longitude: number };
      timestamp: number;
    }
  >();
  private readonly CACHE_TTL = 30 * 60 * 1000;

  constructor(private readonly httpService: HttpService) {}

  async getCoordinatesFromCity(
    city: string,
  ): Promise<{ latitude: number; longitude: number }> {
    try {
      const cacheKey = `geocoding_${city}`;
      const cached = this.getFromCache<{ latitude: number; longitude: number }>(
        cacheKey,
      );
      if (cached) {
        return cached;
      }

      const url = `${this.GEOCODING_BASE_URL}/search`;
      const response = await firstValueFrom(
        this.httpService.get<GeocodingResponse>(url, {
          params: {
            name: city,
            count: 1,
            language: 'fr',
            format: 'json',
          },
        }),
      );

      if (!response.data.results || response.data.results.length === 0) {
        throw new HttpException(
          `Ville "${city}" non trouvée`,
          HttpStatus.NOT_FOUND,
        );
      }

      const result = {
        latitude: response.data.results[0].latitude,
        longitude: response.data.results[0].longitude,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Erreur lors du géocodage de "${city}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Erreur lors de la récupération des coordonnées',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWeatherForecast(
    latitude: number,
    longitude: number,
  ): Promise<WeatherForecastDto> {
    try {
      const cacheKey = `weather_${latitude}_${longitude}`;
      const cached = this.getFromCache<WeatherForecastDto>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = `${this.OPEN_METEO_BASE_URL}/forecast`;
      const response = await firstValueFrom(
        this.httpService.get<WeatherApiResponse>(url, {
          params: {
            latitude,
            longitude,
            current: [
              'temperature_2m',
              'apparent_temperature',
              'relative_humidity_2m',
              'precipitation',
              'weather_code',
              'wind_speed_10m',
              'wind_direction_10m',
            ].join(','),
            daily: [
              'weather_code',
              'temperature_2m_max',
              'temperature_2m_min',
              'precipitation_sum',
              'precipitation_probability_max',
              'wind_speed_10m_max',
              'sunrise',
              'sunset',
            ].join(','),
            timezone: 'Europe/Paris',
            forecast_days: 7,
          },
        }),
      );

      const data = response.data;
      const result = this.formatWeatherData(data);

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Erreur lors de la récupération de la météo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Erreur lors de la récupération des données météo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWeatherByCity(city: string): Promise<WeatherForecastDto> {
    const coordinates = await this.getCoordinatesFromCity(city);
    return this.getWeatherForecast(coordinates.latitude, coordinates.longitude);
  }

  private formatWeatherData(data: WeatherApiResponse): WeatherForecastDto {
    const current: CurrentWeatherDto = {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      weatherDescription: this.getWeatherDescription(data.current.weather_code),
      time: data.current.time,
    };

    const daily: DailyWeatherDto[] = data.daily.time.map(
      (date: string, index: number) => ({
        date,
        temperatureMax: data.daily.temperature_2m_max[index],
        temperatureMin: data.daily.temperature_2m_min[index],
        precipitation: data.daily.precipitation_sum[index],
        precipitationProbability:
          data.daily.precipitation_probability_max[index],
        windSpeedMax: data.daily.wind_speed_10m_max[index],
        weatherCode: data.daily.weather_code[index],
        weatherDescription: this.getWeatherDescription(
          data.daily.weather_code[index],
        ),
        sunrise: data.daily.sunrise[index],
        sunset: data.daily.sunset[index],
      }),
    );

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      current,
      daily,
    };
  }

  private getWeatherDescription(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Ciel dégagé',
      1: 'Principalement dégagé',
      2: 'Partiellement nuageux',
      3: 'Couvert',
      45: 'Brouillard',
      48: 'Brouillard givrant',
      51: 'Bruine légère',
      53: 'Bruine modérée',
      55: 'Bruine dense',
      56: 'Bruine verglaçante légère',
      57: 'Bruine verglaçante dense',
      61: 'Pluie légère',
      63: 'Pluie modérée',
      65: 'Pluie forte',
      66: 'Pluie verglaçante légère',
      67: 'Pluie verglaçante forte',
      71: 'Neige légère',
      73: 'Neige modérée',
      75: 'Neige forte',
      77: 'Grains de neige',
      80: 'Averses légères',
      81: 'Averses modérées',
      82: 'Averses violentes',
      85: 'Averses de neige légères',
      86: 'Averses de neige fortes',
      95: 'Orage',
      96: 'Orage avec grêle légère',
      99: 'Orage avec grêle forte',
    };

    return weatherCodes[code] || 'Conditions inconnues';
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit pour: ${key}`);
    return cached.data as T;
  }

  private setCache(
    key: string,
    data: WeatherForecastDto | { latitude: number; longitude: number },
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
    this.logger.debug('Cache expiré nettoyé');
  }
}
