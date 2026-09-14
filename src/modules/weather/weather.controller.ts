import {
  Controller,
  Get,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { WeatherQueryDto, WeatherForecastDto } from './dto';
import { SiteService } from '../sites/site.service';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    @Inject(SiteService) private readonly siteService: SiteService,
  ) {}
  @Get('by-site/:siteId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Obtenir la météo d'un chantier par son ID",
    description: 'Retourne la météo pour le chantier (ville du site)',
  })
  @ApiParam({
    name: 'siteId',
    type: String,
    example: 'uuid-site',
    description: 'ID du chantier (site)',
  })
  @ApiResponse({
    status: 200,
    description: 'Données météo récupérées',
    type: WeatherForecastDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Site non trouvé',
  })
  async getWeatherBySite(
    @Param('siteId') siteId: string,
    @Request() request: requestWithUser,
  ): Promise<WeatherForecastDto> {
    const site = await this.siteService.findOne(
      siteId,
      request.user.organizationId,
    );
    if (!site.city) {
      throw new HttpException(
        'Le site ne possède pas de ville',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.weatherService.getWeatherByCity(site.city);
  }

  @Get('forecast')
  @ApiOperation({
    summary: 'Obtenir les prévisions météo par coordonnées GPS',
    description:
      'Retourne la météo actuelle et les prévisions sur 7 jours pour une localisation donnée',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    example: 48.8566,
    description: 'Latitude de la localisation',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    example: 2.3522,
    description: 'Longitude de la localisation',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    example: 'Paris',
    description: 'Nom de la ville (alternative aux coordonnées GPS)',
  })
  @ApiResponse({
    status: 200,
    description: 'Données météo récupérées avec succès',
    type: WeatherForecastDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres invalides (coordonnées ou ville requis)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur lors de la récupération des données météo',
  })
  async getWeatherForecast(
    @Query() query: WeatherQueryDto,
  ): Promise<WeatherForecastDto> {
    const { latitude, longitude, city } = query;

    if (!city && (!latitude || !longitude)) {
      throw new HttpException(
        'Vous devez fournir soit une ville (city), soit des coordonnées GPS (latitude et longitude)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (city) {
      return this.weatherService.getWeatherByCity(city);
    }

    return this.weatherService.getWeatherForecast(latitude!, longitude!);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Obtenir la météo actuelle uniquement',
    description: 'Retourne uniquement les conditions météo actuelles',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    example: 48.8566,
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    example: 2.3522,
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    example: 'Paris',
  })
  @ApiResponse({
    status: 200,
    description: 'Météo actuelle récupérée',
  })
  async getCurrentWeather(@Query() query: WeatherQueryDto) {
    const forecast = await this.getWeatherForecast(query);
    return {
      latitude: forecast.latitude,
      longitude: forecast.longitude,
      timezone: forecast.timezone,
      current: forecast.current,
    };
  }

  @Get('city/:cityName')
  @ApiOperation({
    summary: 'Obtenir la météo par nom de ville',
    description: 'Retourne les prévisions météo complètes pour une ville',
  })
  @ApiParam({
    name: 'cityName',
    type: String,
    example: 'Paris',
    description: 'Nom de la ville',
  })
  @ApiResponse({
    status: 200,
    description: 'Données météo récupérées',
    type: WeatherForecastDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ville non trouvée',
  })
  async getWeatherByCity(
    @Param('cityName') cityName: string,
  ): Promise<WeatherForecastDto> {
    return this.weatherService.getWeatherByCity(cityName);
  }

  @Get('coordinates/:city')
  @ApiOperation({
    summary: "Obtenir les coordonnées GPS d'une ville",
    description: "Retourne la latitude et longitude d'une ville",
  })
  @ApiParam({
    name: 'city',
    type: String,
    example: 'Paris',
  })
  @ApiResponse({
    status: 200,
    description: 'Coordonnées récupérées',
  })
  @ApiResponse({
    status: 404,
    description: 'Ville non trouvée',
  })
  async getCoordinates(@Param('city') city: string) {
    return this.weatherService.getCoordinatesFromCity(city);
  }
}
