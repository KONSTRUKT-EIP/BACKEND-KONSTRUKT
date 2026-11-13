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
import type { requestWithUser } from '../auth/jwt.strategy';
import {
  RequireSiteAccess,
  SitePermission,
} from '../../shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../shared/authorization/site-access.guard';
import { SiteAction } from '../../shared/authorization/site-policies';

import { SiteMembershipService } from './site-membership.service';
import { CreateSiteMembershipDto } from './dto/create-site-membership.dto';
import { UpdateSiteMembershipDto } from './dto/update-site-membership.dto';

@ApiTags('Site Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SiteAccessGuard)
@RequireSiteAccess()
@Controller('sites/:siteId/memberships')
export class SiteMembershipController {
  constructor(private readonly service: SiteMembershipService) {}

  @Get()
  @SitePermission(SiteAction.VIEW_MEMBERS)
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
  @SitePermission(SiteAction.MANAGE_MEMBERS)
  @ApiOperation({
    summary: 'Créer une affectation chantier',
  })
  create(
    @Param('siteId') siteId: string,
    @Body() dto: CreateSiteMembershipDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.create(
      siteId,
      dto,
      request.user.organizationId,
      request.siteRole!,
    );
  }

  @Patch(':membershipId')
  @SitePermission(SiteAction.MANAGE_MEMBERS)
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
      request.siteRole!,
    );
  }

  @Delete(':membershipId')
  @SitePermission(SiteAction.MANAGE_MEMBERS)
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
      request.siteRole!,
    );
  }
}
