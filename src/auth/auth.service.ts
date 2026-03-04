import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authBody, registerBody } from './auth.controller';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { userPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}
    async login({authBody}: {authBody: authBody}) {
        const { email, password } = authBody;

        const hashedPassword = await this.hashPassword(password);
        console.log('Hashed password:', hashedPassword, password);

        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: authBody.email,
            },
        });

        if (!existingUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Here you would normally check the password and generate a JWT token
        const isPasswordValid = await this.isPasswordValid(authBody.password, existingUser.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authenticateUser({ userId: existingUser.id });
    }
    
    async register({registerBody}: {registerBody: registerBody}) {
        const { email, password } = registerBody;

        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: registerBody.email,
            },
        });

        if (existingUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const hashedPassword = await this.hashPassword(password);

        const newUser = await this.prisma.user.create({
            data: {
                email: registerBody.email,
                password: hashedPassword,
                firstName: registerBody.firstName,
                lastName: registerBody.lastName,
                organizationId: '68a6fb0d-2d97-48f5-8672-928013638e6d',
                role: 'OUVRIER',
            },
        });

        return this.authenticateUser({ userId: newUser.id });
    }

    async hashPassword(password: string): Promise<string> {
        const hashedPassword = await hash(password, 10);
        return hashedPassword;
    }

    private async isPasswordValid(password: string, hashedPassword: string): Promise<boolean> {
        return await compare(password, hashedPassword);
    }

    private async authenticateUser({ userId }: userPayload) {
        const payload: userPayload = { userId };
        return {
            access_token: await this.jwtService.signAsync(payload),
        }
    }
}
