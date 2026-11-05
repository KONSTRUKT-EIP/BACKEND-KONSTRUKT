import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { requestWithUser } from '../auth/jwt.strategy';
import { UserRole } from '../../shared/types/roles.enum';
import { QueryTaskAlertsDto } from './dto/query-task-alerts.dto';
import { TaskAlertService } from './task-alert.service';

@ApiTags('Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('planning/alerts')
export class TaskAlertController {
  constructor(private readonly service: TaskAlertService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Lister les alertes métier (planning, météo, retard)',
  })
  @ApiResponse({ status: 200, description: 'Liste paginée des alertes' })
  findAll(
    @Query() query: QueryTaskAlertsDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.findAll(query, request.user.organizationId);
  }

  @Patch('read-all')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Marquer toutes les alertes comme lues' })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiResponse({ status: 200, description: "Nombre d'alertes mises à jour" })
  markAllAsRead(
    @Request() request: requestWithUser,
    @Query('siteId', new ParseUUIDPipe({ optional: true })) siteId?: string,
  ) {
    return this.service.markAllAsRead(request.user.organizationId, siteId);
  }

  @Patch(':id/read')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Marquer une alerte comme lue' })
  @ApiParam({ name: 'id', description: "UUID de l'alerte" })
  @ApiResponse({ status: 200, description: 'Alerte marquée comme lue' })
  @ApiResponse({ status: 404, description: 'Alerte introuvable' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: requestWithUser,
  ) {
    return this.service.markAsRead(id, request.user.organizationId);
  }
}
