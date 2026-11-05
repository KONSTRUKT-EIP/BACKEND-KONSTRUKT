import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import { RequireSiteAccess } from '../../shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../shared/authorization/site-access.guard';
import { LotsService } from './lots.service';

@ApiTags('Lots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SiteAccessGuard)
@RequireSiteAccess()
@Controller('sites/:siteId/lots')
export class LotsController {
  constructor(private readonly service: LotsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary: "Lister les lots d'un chantier avec leur avancement",
  })
  @ApiParam({ name: 'siteId', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Liste des lots' })
  findAll(@Param('siteId', new ParseUUIDPipe()) siteId: string) {
    return this.service.findAll(siteId);
  }

  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary:
      "Récupérer le suivi prévisionnel vs réel d'un lot (plans et envois)",
  })
  @ApiParam({ name: 'siteId', description: 'UUID du chantier' })
  @ApiParam({ name: 'key', description: 'Identifiant du lot, ex. armature' })
  @ApiResponse({ status: 200, description: 'Détail du lot' })
  @ApiResponse({ status: 404, description: 'Lot introuvable' })
  findOne(
    @Param('siteId', new ParseUUIDPipe()) siteId: string,
    @Param('key') key: string,
  ) {
    return this.service.findOne(siteId, key);
  }
}
