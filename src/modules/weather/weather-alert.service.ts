import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AlertSeverity,
  AlertType,
  SiteStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { WeatherForecastDto } from './dto';
import {
  WeatherRisk,
  buildWeatherAlertMessage,
  detectWeatherRisk,
  getDayRange,
} from './weather-alert.rules';
import { WeatherService } from './weather.service';

const WATCHED_SITE_STATUSES = [SiteStatus.PLANIFIE, SiteStatus.EN_COURS];
const OPEN_TASK_STATUSES = [
  TaskStatus.EN_ATTENTE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_PAUSE,
];

@Injectable()
export class WeatherAlertService {
  private readonly logger = new Logger(WeatherAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  @Cron(CronExpression.EVERY_3_HOURS)
  async checkWeatherAlerts(): Promise<number> {
    const sites = await this.prisma.site.findMany({
      where: { status: { in: WATCHED_SITE_STATUSES } },
      select: { id: true, city: true },
    });

    let created = 0;
    for (const site of sites) {
      created += await this.checkSite(site.id, site.city);
    }

    this.logger.log(`${created} alerte(s) météo créée(s)`);
    return created;
  }

  async checkSite(siteId: string, city: string): Promise<number> {
    let forecast: WeatherForecastDto;
    try {
      forecast = await this.weatherService.getWeatherByCity(city);
    } catch {
      this.logger.warn(`Météo indisponible pour le site ${siteId}`);
      return 0;
    }

    let created = 0;
    for (const day of forecast.daily) {
      const risk = detectWeatherRisk(day);
      if (risk) {
        created += await this.alertTasksOfDay(siteId, day.date, risk);
      }
    }

    return created;
  }

  private async alertTasksOfDay(
    siteId: string,
    date: string,
    risk: WeatherRisk,
  ): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: {
        siteZone: { siteId },
        status: { in: OPEN_TASK_STATUSES },
        plannedEnd: getDayRange(date),
      },
      select: { id: true },
    });
    const message = buildWeatherAlertMessage(date, risk);

    let created = 0;
    for (const task of tasks) {
      if (await this.createAlertOnce(task.id, risk.severity, message)) {
        created += 1;
      }
    }

    return created;
  }

  private async createAlertOnce(
    taskId: string,
    severity: AlertSeverity,
    message: string,
  ): Promise<boolean> {
    const existing = await this.prisma.taskAlert.findFirst({
      where: { taskId, type: AlertType.AUTRE, message },
      select: { id: true },
    });
    if (existing) {
      return false;
    }

    await this.prisma.taskAlert.create({
      data: { taskId, type: AlertType.AUTRE, severity, message },
    });
    return true;
  }
}
