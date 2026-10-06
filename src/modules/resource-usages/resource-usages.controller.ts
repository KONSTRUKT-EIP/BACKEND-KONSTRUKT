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
import { ResourceUsagesService } from './resource-usages.service';
import { QueryResourceUsagesDto } from './dto/query-resource-usages.dto';
import { CreateResourceUsageDto } from './dto/create-resource-usage.dto';
import { UpdateResourceUsageDto } from './dto/update-resource-usage.dto';

@ApiTags('ResourceUsages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resource-usages')
export class ResourceUsagesController {
  constructor(private readonly service: ResourceUsagesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Lister les consommations de ressources' })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Liste paginee des consommations' })
  findAll(@Query() query: QueryResourceUsagesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Recuperer une consommation par id' })
  @ApiParam({ name: 'id', description: 'UUID de la consommation' })
  @ApiResponse({ status: 200, description: 'Consommation trouvee' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Creer une consommation de ressource' })
  @ApiResponse({ status: 201, description: 'Consommation creee' })
  create(@Body() dto: CreateResourceUsageDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Mettre a jour une consommation de ressource' })
  @ApiParam({ name: 'id', description: 'UUID de la consommation' })
  @ApiResponse({ status: 200, description: 'Consommation mise a jour' })
  update(@Param('id') id: string, @Body() dto: UpdateResourceUsageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer une consommation de ressource' })
  @ApiParam({ name: 'id', description: 'UUID de la consommation' })
  @ApiResponse({ status: 200, description: 'Consommation supprimee' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
