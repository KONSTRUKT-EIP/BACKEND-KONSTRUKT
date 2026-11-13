import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { requestWithUser } from '../auth/jwt.strategy';
import {
  RequireSiteAccess,
  SitePermission,
} from '../../shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../shared/authorization/site-access.guard';
import { SiteAction } from '../../shared/authorization/site-policies';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SiteAccessGuard)
@Controller('sites/:siteId/invitations')
export class SiteInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @RequireSiteAccess()
  @SitePermission(SiteAction.MANAGE_INVITATIONS)
  @ApiOperation({ summary: 'Create an invitation for a site' })
  @ApiParam({ name: 'siteId', description: 'Site UUID' })
  @ApiResponse({ status: 201, description: 'Invitation created.' })
  create(
    @Param('siteId') siteId: string,
    @Body() dto: CreateInvitationDto,
    @Request() request: requestWithUser,
  ) {
    return this.invitationService.create(
      siteId,
      dto,
      request.user.userId,
      request.user.organizationId,
      request.siteRole!,
    );
  }
}
