import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceDto,
  AttendanceStatus,
} from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary:
      'Lister les pointages (filtrable par équipe, utilisateur, date, statut)',
  })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus })
  @ApiResponse({ status: 200, description: 'Liste des pointages' })
  findAll(
    @Request() request: requestWithUser,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.service.findAll({
      teamId,
      userId,
      date,
      status,
      organizationId: request.user.organizationId,
    });
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({
    summary: 'Résumé journalier par équipe (présents/absents/retards/congés)',
  })
  @ApiQuery({ name: 'teamId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Résumé journalier' })
  getDailySummary(
    @Query('teamId') teamId: string,
    @Query('date') date: string,
    @Request() request: requestWithUser,
  ) {
    return this.service.getDailySummary(
      teamId,
      date,
      request.user.organizationId,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({ summary: 'Récupérer un pointage par ID' })
  @ApiParam({ name: 'id', description: 'UUID du pointage' })
  @ApiResponse({ status: 200, description: 'Pointage trouvé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.findOne(id, request.user.organizationId);
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({
    summary: 'Créer un pointage (présence/absence/retard/congé)',
  })
  @ApiResponse({ status: 201, description: 'Pointage créé' })
  @ApiResponse({
    status: 409,
    description: 'Pointage déjà existant pour cette date',
  })
  create(
    @Body() dto: CreateAttendanceDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.create(dto, request.user.organizationId);
  }

  @Put(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({ summary: 'Mettre à jour un pointage' })
  @ApiParam({ name: 'id', description: 'UUID du pointage' })
  @ApiResponse({ status: 200, description: 'Pointage mis à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.update(id, dto, request.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Supprimer un pointage' })
  @ApiParam({ name: 'id', description: 'UUID du pointage' })
  @ApiResponse({ status: 200, description: 'Pointage supprimé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(id, request.user.organizationId);
  }

  @Patch('upsert')
  @Roles(
    UserRole.ADMIN,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
    UserRole.COLLABORATEUR,
  )
  @ApiOperation({ summary: 'Créer ou mettre à jour un pointage' })
  @ApiResponse({ status: 200, description: 'Pointage créé ou mis à jour' })
  upsert(
    @Body() dto: UpsertAttendanceDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.upsert(dto, request.user.organizationId);
  }
}
