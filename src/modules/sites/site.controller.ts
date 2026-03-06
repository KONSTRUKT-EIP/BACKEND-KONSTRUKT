import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SiteController {
  constructor(private readonly service: SiteService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Lister tous les chantiers' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filtrer par organisation' })
  @ApiResponse({ status: 200, description: 'Liste des chantiers' })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.service.findAll(organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Récupérer un chantier par ID' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier trouvé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Créer un chantier' })
  @ApiResponse({ status: 201, description: 'Chantier créé' })
  create(@Body() dto: CreateSiteDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Mettre à jour un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier mis à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier supprimé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
