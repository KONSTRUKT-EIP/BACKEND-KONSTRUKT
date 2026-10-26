import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';

import { SiteMembershipService } from './site-membership.service';
import { CreateSiteMembershipDto } from './dto/create-site-membership.dto';
import { UpdateSiteMembershipDto } from './dto/update-site-membership.dto';

@ApiTags('Site Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites/:siteId/memberships')
export class SiteMembershipController {
  constructor(private readonly service: SiteMembershipService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lister les affectations d’un chantier',
  })
  findAll(
    @Param('siteId') siteId: string,
    @Request() request: requestWithUser,
  ) {
    return this.service.findAll(siteId, request.user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Créer une affectation chantier',
  })
  create(
    @Param('siteId') siteId: string,
    @Body() dto: CreateSiteMembershipDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.create(siteId, dto, request.user.organizationId);
  }

  @Patch(':membershipId')
  @Roles(UserRole.ADMIN)
  @ApiParam({
    name: 'membershipId',
  })
  @ApiOperation({
    summary: 'Modifier une affectation chantier',
  })
  update(
    @Param('siteId') siteId: string,
    @Param('membershipId')
    membershipId: string,
    @Body() dto: UpdateSiteMembershipDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.update(
      siteId,
      membershipId,
      dto,
      request.user.organizationId,
    );
  }

  @Delete(':membershipId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Supprimer une affectation chantier',
  })
  remove(
    @Param('siteId') siteId: string,
    @Param('membershipId')
    membershipId: string,
    @Request() request: requestWithUser,
  ) {
    return this.service.remove(
      siteId,
      membershipId,
      request.user.organizationId,
    );
  }
}
