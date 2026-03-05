import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { requestWithUser } from './jwt.strategy';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT access token and refresh token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered, returns JWT access token and refresh token.',
  })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access token and rotated refresh token.',
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshTokens(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout — revoke all refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() request: requestWithUser) {
    return await this.authService.logout(request.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Old password incorrect or unauthorized.' })
  async changePassword(
    @Request() request: requestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(request.user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async authenticateUser(@Request() request: requestWithUser) {
    return await this.userService.getUser({ userId: request.user.userId });
  }
}
