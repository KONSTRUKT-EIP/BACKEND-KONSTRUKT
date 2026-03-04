import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authBody, registerBody } from './auth.controller';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { userPayload } from './jwt.strategy';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService, private readonly jwtService: JwtService) {}

    async login({authBody}: {authBody: authBody}) {
        const existingUser = await this.userService.findByEmail(authBody.email);

        if (!existingUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await compare(authBody.password, existingUser.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authenticateUser({ userId: existingUser.id });
    }

    async register({registerBody}: {registerBody: registerBody}) {
        const existingUser = await this.userService.findByEmail(registerBody.email);

        if (existingUser) {
            throw new UnauthorizedException('Email already in use');
        }

        const newUser = await this.userService.createUser({
            email: registerBody.email,
            password: registerBody.password,
            firstName: registerBody.firstName,
            lastName: registerBody.lastName,
            organizationId: registerBody.organizationId,
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
