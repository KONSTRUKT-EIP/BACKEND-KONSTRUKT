import { AlertSeverity } from '@prisma/client';
import { DailyWeatherDto } from '../../../src/modules/weather/dto';
import {
  buildWeatherAlertMessage,
  detectWeatherRisk,
  getDayRange,
} from '../../../src/modules/weather/weather-alert.rules';

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

describe('weather-alert.rules', () => {
  describe('detectWeatherRisk', () => {
    it('ne signale rien par beau temps', () => {
      expect(detectWeatherRisk(buildDay({}))).toBeNull();
    });

    it('signale un orage en CRITICAL', () => {
      const risk = detectWeatherRisk(
        buildDay({ weatherCode: 95, weatherDescription: 'Orage' }),
      );

      expect(risk).toEqual({
        severity: AlertSeverity.CRITICAL,
        reasons: ['orage'],
      });
    });

    it('distingue vent fort (HIGH) et vent violent (CRITICAL)', () => {
      expect(detectWeatherRisk(buildDay({ windSpeedMax: 55 }))).toEqual({
        severity: AlertSeverity.HIGH,
        reasons: ['vent fort (55 km/h)'],
      });
      expect(detectWeatherRisk(buildDay({ windSpeedMax: 80.4 }))).toEqual({
        severity: AlertSeverity.CRITICAL,
        reasons: ['vent violent (80 km/h)'],
      });
    });

    it('signale pluie forte, gel, canicule et verglas en HIGH', () => {
      const risk = detectWeatherRisk(
        buildDay({
          precipitation: 25,
          temperatureMin: -6,
          temperatureMax: 36,
          weatherCode: 66,
          weatherDescription: 'Pluie verglaçante légère',
        }),
      );

      expect(risk?.severity).toBe(AlertSeverity.HIGH);
      expect(risk?.reasons).toEqual([
        'pluie verglaçante légère',
        'fortes pluies (25 mm)',
        'gel (-6 °C)',
        'canicule (36 °C)',
      ]);
    });

    it('passe en CRITICAL dès qu’un motif critique est présent', () => {
      const risk = detectWeatherRisk(
        buildDay({ windSpeedMax: 75, precipitation: 30 }),
      );

      expect(risk?.severity).toBe(AlertSeverity.CRITICAL);
      expect(risk?.reasons).toEqual([
        'vent violent (75 km/h)',
        'fortes pluies (30 mm)',
      ]);
    });
  });

  describe('buildWeatherAlertMessage', () => {
    it('contient « météo » pour être reconnu par le planning', () => {
      const message = buildWeatherAlertMessage('2026-11-03', {
        severity: AlertSeverity.HIGH,
        reasons: ['vent fort (55 km/h)', 'gel (-6 °C)'],
      });

      expect(message).toBe(
        'Alerte météo le 03/11/2026 : vent fort (55 km/h), gel (-6 °C)',
      );
    });
  });

  describe('getDayRange', () => {
    it('couvre une journée locale complète', () => {
      const range = getDayRange('2026-11-03');

      expect(range.gte).toEqual(new Date(2026, 10, 3));
      expect(range.lt).toEqual(new Date(2026, 10, 4));
    });
  });
});
