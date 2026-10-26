import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import { ResourcesService } from './resources.service';
import { QueryResourcesDto } from './dto/query-resources.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Lister les ressources avec filtres chantier' })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'supplier', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Liste paginee des ressources' })
  findAll(@Query() query: QueryResourcesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Recuperer le detail d une ressource' })
  @ApiParam({ name: 'id', description: 'UUID de la ressource' })
  @ApiResponse({ status: 200, description: 'Detail ressource' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Creer une ressource' })
  @ApiResponse({ status: 201, description: 'Ressource creee' })
  create(@Body() dto: CreateResourceDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Mettre a jour une ressource' })
  @ApiParam({ name: 'id', description: 'UUID de la ressource' })
  @ApiResponse({ status: 200, description: 'Ressource mise a jour' })
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer une ressource' })
  @ApiParam({ name: 'id', description: 'UUID de la ressource' })
  @ApiResponse({ status: 200, description: 'Ressource supprimee' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
