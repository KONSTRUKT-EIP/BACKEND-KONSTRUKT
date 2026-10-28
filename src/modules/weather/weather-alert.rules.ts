import { AlertSeverity } from '@prisma/client';
import { DailyWeatherDto } from './dto';

export interface WeatherRisk {
  severity: AlertSeverity;
  reasons: string[];
}

const STORM_CODES = [95, 96, 99];
const FREEZING_CODES = [56, 57, 66, 67];
const HEAVY_SNOW_CODES = [75, 86];
const STRONG_WIND_KMH = 50;
const VIOLENT_WIND_KMH = 70;
const HEAVY_RAIN_MM = 20;
const FROST_CELSIUS = -5;
const HEAT_CELSIUS = 35;

function collectCriticalReasons(day: DailyWeatherDto): string[] {
  const reasons: string[] = [];

  if (STORM_CODES.includes(day.weatherCode)) {
    reasons.push(day.weatherDescription.toLowerCase());
  }
  if (day.windSpeedMax >= VIOLENT_WIND_KMH) {
    reasons.push(`vent violent (${Math.round(day.windSpeedMax)} km/h)`);
  }

  return reasons;
}

function collectHighReasons(day: DailyWeatherDto): string[] {
  const reasons: string[] = [];
  const code = day.weatherCode;
  const wind = day.windSpeedMax;

  if (FREEZING_CODES.includes(code) || HEAVY_SNOW_CODES.includes(code)) {
    reasons.push(day.weatherDescription.toLowerCase());
  }
  if (wind >= STRONG_WIND_KMH && wind < VIOLENT_WIND_KMH) {
    reasons.push(`vent fort (${Math.round(wind)} km/h)`);
  }
  if (day.precipitation >= HEAVY_RAIN_MM) {
    reasons.push(`fortes pluies (${Math.round(day.precipitation)} mm)`);
  }
  if (day.temperatureMin <= FROST_CELSIUS) {
    reasons.push(`gel (${Math.round(day.temperatureMin)} °C)`);
  }
  if (day.temperatureMax >= HEAT_CELSIUS) {
    reasons.push(`canicule (${Math.round(day.temperatureMax)} °C)`);
  }

  return reasons;
}

export function detectWeatherRisk(day: DailyWeatherDto): WeatherRisk | null {
  const critical = collectCriticalReasons(day);
  const reasons = [...critical, ...collectHighReasons(day)];

  if (reasons.length === 0) {
    return null;
  }

  return {
    severity: critical.length > 0 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
    reasons,
  };
}

export function buildWeatherAlertMessage(
  date: string,
  risk: WeatherRisk,
): string {
  const [year, month, dayOfMonth] = date.split('-');
  const frenchDate = `${dayOfMonth}/${month}/${year}`;

  return `Alerte météo le ${frenchDate} : ${risk.reasons.join(', ')}`;
}

export function getDayRange(date: string): { gte: Date; lt: Date } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { gte: start, lt: end };
}
