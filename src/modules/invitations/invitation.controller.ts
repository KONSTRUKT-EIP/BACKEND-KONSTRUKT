import {
  Body,
  Controller,
  Delete,
  Get,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { requestWithUser } from '../auth/jwt.strategy';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Public } from '../auth/public.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':token')
  @Public()
  @ApiOperation({
    summary: 'Get public onboarding information for an invitation',
  })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation is valid.' })
  get(@Param('token') token: string) {
    return this.invitationService.getByToken(token);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'List organization invitations' })
  @ApiResponse({ status: 200, description: 'Organization invitations.' })
  findAll(@Request() request: requestWithUser) {
    return this.invitationService.findAll(
      request.user.organizationId,
      request.user.role,
    );
  }

  @Post(':id/resend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Resend an invitation email' })
  @ApiParam({ name: 'id', description: 'Invitation UUID' })
  @ApiResponse({ status: 200, description: 'Invitation resent.' })
  resend(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.invitationService.resend(id, request.user);
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept an invitation and create the user account' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 201, description: 'Invitation accepted.' })
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitationService.accept(token, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel an invitation' })
  @ApiParam({ name: 'id', description: 'Invitation UUID' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled.' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.invitationService.remove(id, request.user);
  }
}
