import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Lister toutes les organisations' })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Récupérer une organisation par ID' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Organisation trouvée' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer une organisation' })
  @ApiResponse({ status: 201, description: 'Organisation créée' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une organisation' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Organisation mise à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer une organisation' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Organisation supprimée' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
