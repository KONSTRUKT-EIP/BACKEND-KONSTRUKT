import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { userPayload } from './jwt.strategy';
import { UserService } from '../users/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (!existingUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, existingUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authenticateUser({ userId: existingUser.id });
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const newUser = await this.userService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: dto.organizationId,
    });

    return this.authenticateUser({ userId: newUser.id });
  }

  private async authenticateUser({ userId }: userPayload) {
    const payload: userPayload = { userId };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
