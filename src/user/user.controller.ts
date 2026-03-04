import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':userId')
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ 
        userId,
    });
  }

  @Post()
  createUser(@Body() body: { email: string; password: string; firstName: string; lastName: string; organizationId: string }) {
    return this.userService.createUser(body);
  }
}