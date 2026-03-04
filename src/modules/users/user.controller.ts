import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { createUserSchema, updateUserSchema } from './user.schema';
import { z } from 'zod';

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(@Body() body: CreateUserInput) {
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    const { email, password, role, firstName, lastName, organizationId } =
      result.data;
    return this.userService.create({
      email,
      passwordHash: password,
      role,
      firstName,
      lastName,
      organizationId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id') id: string, @Body() body: UpdateUserInput) {
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        'Validation failed: ' + JSON.stringify(result.error.issues),
      );
    }
    const { password, ...rest } = result.data;
    const updateData = password ? { ...rest, passwordHash: password } : rest;
    return this.userService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
