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
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';

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
  findAll(@Query('siteId') siteId?: string) {
    return this.service.findAll(siteId);
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
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Créer une équipe' })
  @ApiResponse({ status: 201, description: 'Équipe créée' })
  create(@Body() dto: CreateTeamDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Mettre à jour une équipe' })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Équipe mise à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Supprimer une équipe' })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 200, description: 'Équipe supprimée' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
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
  getMembers(@Param('id') id: string) {
    return this.service.getMembers(id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Ajouter un membre à l'équipe" })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiResponse({ status: 201, description: 'Membre ajouté' })
  @ApiResponse({ status: 409, description: 'Déjà membre' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.service.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Retirer un membre de l'équipe" })
  @ApiParam({ name: 'id', description: "UUID de l'équipe" })
  @ApiParam({ name: 'userId', description: "UUID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Membre retiré' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeMember(id, userId);
  }
}
