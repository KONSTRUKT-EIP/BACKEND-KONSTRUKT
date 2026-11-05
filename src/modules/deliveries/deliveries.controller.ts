import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
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
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { requestWithUser } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({
    summary: 'Lister les livraisons avec filtres chantier/date/statut',
  })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateField', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Liste paginee des livraisons' })
  findAll(
    @Query() query: QueryDeliveriesDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.findAll(query, request.user.organizationId);
  }

  @Get(':id')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Recuperer une livraison par id' })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livraison trouvee' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.findOne(id, request.user.organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Creer une livraison' })
  @ApiResponse({ status: 201, description: 'Livraison creee' })
  create(@Body() dto: CreateDeliveryDto, @Request() request: requestWithUser) {
    return this.service.create(dto, request.user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Mettre a jour une livraison' })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livraison mise a jour' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.update(id, dto, request.user.organizationId);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Mettre a jour le statut d une livraison' })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Statut mis a jour' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.updateStatus(id, dto, request.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Supprimer une livraison' })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livraison supprimee' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(id, request.user.organizationId);
  }
}
