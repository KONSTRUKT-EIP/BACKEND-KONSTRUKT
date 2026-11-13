import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateUserDto, @Request() request: requestWithUser) {
    return this.userService.create(
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Request() request: requestWithUser) {
    return this.userService.findAll(
      1,
      20,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN_ORGANIZATION,
    UserRole.CHEF_PROJET,
    UserRole.CONDUCTEUR_TRAVAUX,
  )
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.userService.findOne(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() request: requestWithUser,
  ) {
    return this.userService.update(
      id,
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Change a user role' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() request: requestWithUser,
  ) {
    return this.userService.updateRole(id, dto, request.user.organizationId);
  }

  @Patch(':id/access')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Enable or disable a user access' })
  updateAccess(
    @Param('id') id: string,
    @Body() dto: UpdateUserAccessDto,
    @Request() request: requestWithUser,
  ) {
    return this.userService.updateAccess(id, dto, request.user.organizationId);
  }

  @Get(':id/assignments')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'List a user site assignments' })
  findAssignments(
    @Param('id') id: string,
    @Request() request: requestWithUser,
  ) {
    return this.userService.findAssignments(id, request.user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN_ORGANIZATION)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.userService.remove(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }
}
