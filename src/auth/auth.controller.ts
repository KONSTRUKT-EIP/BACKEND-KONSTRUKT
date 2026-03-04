import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { requestWithUser } from './jwt.strategy';
import { UserService } from 'src/user/user.service';

export type authBody = {email: string; password: string};
export type registerBody = {email: string; password: string; firstName: string; lastName: string; organizationId: string};

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly userService: UserService) {}
    @Post('login')
    async login(@Body() authBody: authBody) {
        return await this.authService.login({ authBody });
    }

    @Post('register')
    async register(@Body() registerBody: registerBody) {
        return await this.authService.register({ registerBody });
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async authenticateUser(@Request() request: requestWithUser) {
        return await this.userService.getUser({ userId: request.user.userId });
    }

}
