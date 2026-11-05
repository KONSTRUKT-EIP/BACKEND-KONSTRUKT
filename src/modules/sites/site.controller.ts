import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { SiteService } from './site.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';
import {
  RequireSiteAccess,
  SitePermission,
} from '../../shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../shared/authorization/site-access.guard';
import { SiteAction } from '../../shared/authorization/site-policies';

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SiteController {
  constructor(private readonly service: SiteService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Lister tous les chantiers' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filtrer par organisation',
  })
  @ApiResponse({ status: 200, description: 'Liste des chantiers' })
  findAll(@Request() request: requestWithUser) {
    return this.service.findAll(
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Get(':id')
  @UseGuards(SiteAccessGuard)
  @RequireSiteAccess('param', 'id')
  @SitePermission(SiteAction.VIEW_SITE)
  @ApiOperation({ summary: 'Récupérer un chantier par ID' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier trouvé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.findOne(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Créer un chantier' })
  @ApiResponse({ status: 201, description: 'Chantier créé' })
  create(@Body() dto: CreateSiteDto, @Request() request: requestWithUser) {
    return this.service.create(
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Put(':id')
  @UseGuards(SiteAccessGuard)
  @RequireSiteAccess('param', 'id')
  @SitePermission(SiteAction.UPDATE_SITE)
  @ApiOperation({ summary: 'Mettre à jour un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier mis à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.update(
      id,
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(SiteAccessGuard)
  @RequireSiteAccess('param', 'id')
  @SitePermission(SiteAction.DELETE_SITE)
  @ApiOperation({ summary: 'Supprimer un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier supprimé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }
}
