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
import { UserRole } from '@prisma/client';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites/:siteId/invitations')
export class SiteInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Roles(UserRole.ADMIN)
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
      request.user.role,
    );
  }
}
