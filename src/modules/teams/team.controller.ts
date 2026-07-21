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
} from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly service: TeamService) {}

  // ─── Équipes ────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Lister les équipes (filtrable par chantier)' })
  @ApiQuery({
    name: 'siteId',
    required: false,
    description: 'Filtrer par chantier',
  })
  @ApiResponse({ status: 200, description: 'Liste des équipes' })
  findAll(@Query('siteId') siteId: string | undefined, @Request() request: requestWithUser) {
    return this.service.findAll(siteId, request.user.organizationId);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({ summary: 'Récupérer une équipe par ID (avec membres)' })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Équipe trouvée' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.findOne(id, request.user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Créer une équipe' })
  @ApiResponse({ status: 201, description: 'Équipe créée' })
  create(@Body() dto: CreateTeamDto, @Request() request: requestWithUser) {
    return this.service.create(dto, request.user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Mettre à jour une équipe' })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Équipe mise à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto, @Request() request: requestWithUser) {
    return this.service.update(id, dto, request.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Supprimer une équipe' })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Équipe supprimée' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(id, request.user.organizationId);
  }

  // ─── Membres ────────────────────────────────────────────────────────────────

  @Get(':id/members')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({ summary: "Lister les membres d'une équipe" })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Liste des membres' })
  getMembers(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.getMembers(id, request.user.organizationId);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Ajouter un membre à l'équipe" })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 201, description: 'Membre ajouté' })
  @ApiResponse({ status: 409, description: 'Déjà membre' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @Request() request: requestWithUser) {
    return this.service.addMember(id, dto, request.user.organizationId);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Retirer un membre de l'équipe" })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiParam({ name: 'userId', description: "UUID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Membre retiré' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() request: requestWithUser) {
    return this.service.removeMember(id, userId, request.user.organizationId);
  }

  @Get('site/:siteId/stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: "Obtenir les statistiques d'équipe pour un chantier",
  })
  @ApiParam({ name: 'siteId', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: "Statistiques d'équipe" })
  async getTeamStats(@Param('siteId') siteId: string, @Request() request: requestWithUser): Promise<{
    total: number;
    complete: number;
    enCours: number;
    retards: number;
    enAttente: number;
    annule: number;
    pctPresents: number;
    pctAbsents: number;
    pctComplete: number;
    pctEnCours: number;
  }> {
    return await this.service.getTeamStats(siteId, request.user.organizationId);
  }

  @Get('site/:siteId/members-details')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Obtenir les détails des membres pour un chantier',
  })
  @ApiParam({ name: 'siteId', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Liste détaillée des membres' })
  async getTeamMembersDetails(@Param('siteId') siteId: string, @Request() request: requestWithUser): Promise<
    Array<{
      id: string;
      teamId: string;
      specialite: string;
      name: string;
      email: string;
      dateDebut: string;
      status: string;
      initials: string;
      color: string;
      starred: boolean;
    }>
  > {
    return await this.service.getTeamMembersDetails(siteId, request.user.organizationId);
  }

  @Get('site/:siteId/attendance-week')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Obtenir les présences de la semaine pour un chantier',
  })
  @ApiParam({ name: 'siteId', description: 'UUID du chantier' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Présences de la semaine' })
  async getAttendanceWeek(
    @Param('siteId') siteId: string,
    @Query('startDate') startDate: string | undefined,
    @Request() request: requestWithUser,
  ): Promise<{
    days: string[];
    dates: string[];
    attendances: Record<string, string[]>;
  }> {
    return await this.service.getAttendanceWeek(siteId, startDate, request.user.organizationId);
  }
}
