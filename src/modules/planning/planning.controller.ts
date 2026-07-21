import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  ApiBody,
} from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { CreatePlanningTaskDto } from './dto/create-planning-task.dto';
import { UpdatePlanningTaskDto } from './dto/update-planning-task.dto';
import { PlanningTaskResponseDto } from './dto/planning-task-response.dto';
import { PlanningActionResponseDto } from './dto/planning-action-response.dto';
import { WeekPlanningResponseDto } from './dto/week-planning-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import { TaskStatus } from '@prisma/client';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('planning')
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Get('tasks')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Récupérer toutes les tâches du planning',
    description:
      'Permet de filtrer les tâches par date (startDate, endDate), zone de chantier (siteZoneId) ou statut.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début (format ISO: YYYY-MM-DD)',
    example: '2026-03-10',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Date de fin (format ISO: YYYY-MM-DD)',
    example: '2026-03-16',
  })
  @ApiQuery({
    name: 'siteZoneId',
    required: false,
    description: 'Filtrer par zone de chantier (UUID)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filtrer par statut',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des tâches du planning',
    type: [PlanningTaskResponseDto],
  })
  findAllTasks(
    @Request() request: requestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteZoneId') siteZoneId?: string,
    @Query('status') status?: TaskStatus,
  ): Promise<PlanningTaskResponseDto[]> {
    return this.service.findAll(startDate, endDate, siteZoneId, status, request.user.organizationId);
  }

  @Get('tasks/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Récupérer une tâche planning par ID',
    description:
      "Retourne les détails complets d'une tâche (avec alertes et progression)",
  })
  @ApiParam({ name: 'id', description: 'UUID de la tâche' })
  @ApiResponse({
    status: 200,
    description: 'Tâche trouvée',
  })
  @ApiResponse({ status: 404, description: 'Tâche introuvable' })
  findOneTask(@Param('id') id: string, @Request() request: requestWithUser): Promise<any> {
    return this.service.findOne(id, request.user.organizationId);
  }

  @Post('tasks')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary: 'Créer une nouvelle tâche planning',
  })
  @ApiBody({ type: CreatePlanningTaskDto })
  @ApiResponse({
    status: 201,
    description: 'Tâche créée avec succès',
  })
  @ApiResponse({
    status: 404,
    description: 'Zone de chantier ou utilisateur introuvable',
  })
  createTask(@Body() dto: CreatePlanningTaskDto, @Request() request: requestWithUser): Promise<any> {
    return this.service.create(dto, request.user.organizationId);
  }

  @Put('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary: 'Mettre à jour une tâche planning',
  })
  @ApiParam({ name: 'id', description: 'UUID de la tâche' })
  @ApiBody({ type: UpdatePlanningTaskDto })
  @ApiResponse({
    status: 200,
    description: 'Tâche mise à jour avec succès',
  })
  @ApiResponse({ status: 404, description: 'Tâche introuvable' })
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdatePlanningTaskDto,
    @Request() request: requestWithUser,
  ): Promise<any> {
    return this.service.update(id, dto, request.user.organizationId);
  }

  @Delete('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({
    summary: 'Supprimer une tâche planning',
  })
  @ApiParam({ name: 'id', description: 'UUID de la tâche' })
  @ApiResponse({
    status: 200,
    description: 'Tâche supprimée avec succès',
  })
  @ApiResponse({ status: 404, description: 'Tâche introuvable' })
  removeTask(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(id, request.user.organizationId);
  }

  @Get('actions')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Récupérer toutes les actions requises',
    description:
      "Retourne les alertes non lues de haute priorité sous forme d'actions",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des actions requises',
    type: [PlanningActionResponseDto],
  })
  findAllActions(@Request() request: requestWithUser): Promise<PlanningActionResponseDto[]> {
    return this.service.findActions(request.user.organizationId);
  }

  @Get('tasks/:id/actions')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: "Récupérer les actions d'une tâche spécifique",
  })
  @ApiParam({ name: 'id', description: 'UUID de la tâche' })
  @ApiResponse({
    status: 200,
    description: 'Liste des actions de la tâche',
    type: [PlanningActionResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Tâche introuvable' })
  findTaskActions(
    @Param('id') id: string,
    @Request() request: requestWithUser,
  ): Promise<PlanningActionResponseDto[]> {
    return this.service.findTaskActions(id, request.user.organizationId);
  }

  @Delete('actions/:id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary: 'Marquer une action comme lue',
    description: "Marque l'alerte associée comme lue (supprime l'action)",
  })
  @ApiParam({ name: 'id', description: "UUID de l'action" })
  @ApiResponse({
    status: 200,
    description: 'Action marquée comme lue',
  })
  @ApiResponse({ status: 404, description: 'Action introuvable' })
  removeAction(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.removeAction(id, request.user.organizationId);
  }

  @Get('week')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Récupérer la vue planning complète pour une semaine',
    description:
      'Retourne les tâches, actions et statistiques pour une semaine donnée',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Date de début de la semaine (format ISO: YYYY-MM-DD)',
    example: '2026-03-10',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'Date de fin de la semaine (format ISO: YYYY-MM-DD)',
    example: '2026-03-16',
  })
  @ApiResponse({
    status: 200,
    description: 'Vue planning de la semaine',
    type: WeekPlanningResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de date manquants ou invalides',
  })
  getWeekPlanning(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() request: requestWithUser,
  ): Promise<WeekPlanningResponseDto> {
    return this.service.getWeekPlanning(startDate, endDate, request.user.organizationId);
  }
}
