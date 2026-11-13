import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  RequireSiteAccess,
  SitePermission,
} from '../../shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../shared/authorization/site-access.guard';
import { SiteAction } from '../../shared/authorization/site-policies';
import { SiteZoneService } from './site-zone.service';
import { CreateSiteZoneDto } from './dto/create-site-zone.dto';
import { UpdateSiteZoneDto } from './dto/update-site-zone.dto';

@ApiTags('Site Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SiteAccessGuard)
@RequireSiteAccess()
@ApiParam({ name: 'siteId', description: 'UUID du chantier' })
@Controller('sites/:siteId/zones')
export class SiteZoneController {
  constructor(private readonly service: SiteZoneService) {}

  @Get()
  @SitePermission(SiteAction.VIEW_SITE)
  @ApiOperation({ summary: 'Lister les zones d un chantier' })
  @ApiResponse({ status: 200, description: 'Liste des zones' })
  findAll(@Param('siteId', ParseUUIDPipe) siteId: string) {
    return this.service.findAll(siteId);
  }

  @Get(':zoneId')
  @SitePermission(SiteAction.VIEW_SITE)
  @ApiOperation({ summary: 'Recuperer le detail d une zone' })
  @ApiParam({ name: 'zoneId', description: 'UUID de la zone' })
  @ApiResponse({ status: 200, description: 'Detail zone' })
  @ApiResponse({ status: 404, description: 'Zone introuvable' })
  findOne(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ) {
    return this.service.findOne(siteId, zoneId);
  }

  @Post()
  @SitePermission(SiteAction.UPDATE_SITE)
  @ApiOperation({ summary: 'Creer une zone de chantier' })
  @ApiResponse({ status: 201, description: 'Zone creee' })
  @ApiResponse({ status: 409, description: 'Nom de zone deja utilise' })
  create(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Body() dto: CreateSiteZoneDto,
  ) {
    return this.service.create(siteId, dto);
  }

  @Patch(':zoneId')
  @SitePermission(SiteAction.UPDATE_SITE)
  @ApiOperation({ summary: 'Mettre a jour une zone de chantier' })
  @ApiParam({ name: 'zoneId', description: 'UUID de la zone' })
  @ApiResponse({ status: 200, description: 'Zone mise a jour' })
  @ApiResponse({ status: 409, description: 'Nom de zone deja utilise' })
  update(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: UpdateSiteZoneDto,
  ) {
    return this.service.update(siteId, zoneId, dto);
  }

  @Delete(':zoneId')
  @SitePermission(SiteAction.UPDATE_SITE)
  @ApiOperation({ summary: 'Supprimer une zone de chantier' })
  @ApiParam({ name: 'zoneId', description: 'UUID de la zone' })
  @ApiResponse({ status: 200, description: 'Zone supprimee' })
  @ApiResponse({ status: 409, description: 'Zone encore liee a des taches' })
  remove(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ) {
    return this.service.remove(siteId, zoneId);
  }
}
