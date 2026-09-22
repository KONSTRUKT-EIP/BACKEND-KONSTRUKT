import { ApiProperty } from '@nestjs/swagger';

export class CurrentWeatherDto {
  @ApiProperty({ description: 'Température actuelle en °C' })
  temperature: number;

  @ApiProperty({ description: 'Température ressentie en °C' })
  feelsLike: number;

  @ApiProperty({ description: 'Humidité en %' })
  humidity: number;

  @ApiProperty({ description: 'Vitesse du vent en km/h' })
  windSpeed: number;

  @ApiProperty({ description: 'Direction du vent en degrés' })
  windDirection: number;

  @ApiProperty({ description: 'Précipitations en mm' })
  precipitation: number;

  @ApiProperty({ description: 'Code météo' })
  weatherCode: number;

  @ApiProperty({ description: 'Description de la météo' })
  weatherDescription: string;

  @ApiProperty({ description: 'Date et heure de la donnée' })
  time: string;
}

export class DailyWeatherDto {
  @ApiProperty({ description: 'Date' })
  date: string;

  @ApiProperty({ description: 'Température maximale en °C' })
  temperatureMax: number;

  @ApiProperty({ description: 'Température minimale en °C' })
  temperatureMin: number;

  @ApiProperty({ description: 'Précipitations totales en mm' })
  precipitation: number;

  @ApiProperty({ description: 'Probabilité de précipitations en %' })
  precipitationProbability: number;

  @ApiProperty({ description: 'Vitesse maximale du vent en km/h' })
  windSpeedMax: number;

  @ApiProperty({ description: 'Code météo' })
  weatherCode: number;

  @ApiProperty({ description: 'Description de la météo' })
  weatherDescription: string;

  @ApiProperty({ description: 'Heure de lever du soleil' })
  sunrise: string;

  @ApiProperty({ description: 'Heure de coucher du soleil' })
  sunset: string;
}

export class WeatherForecastDto {
  @ApiProperty({ description: 'Latitude de la localisation' })
  latitude: number;

  @ApiProperty({ description: 'Longitude de la localisation' })
  longitude: number;

  @ApiProperty({ description: 'Fuseau horaire' })
  timezone: string;

  @ApiProperty({ description: 'Météo actuelle', type: CurrentWeatherDto })
  current: CurrentWeatherDto;

  @ApiProperty({
    description: 'Prévisions journalières',
    type: [DailyWeatherDto],
  })
  daily: DailyWeatherDto[];
}
