import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../shared/types/roles.enum';
import { PrismaService } from '../../lib/prisma/prisma.service';

export type userPayload = {
  userId: string;
  organizationId?: string | null;
  role?: UserRole;
};
export type requestWithUser = {
  user: userPayload;
  siteRole?: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: userPayload): Promise<userPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { organizationId: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User access is disabled');
    }

    return {
      userId: payload.userId,
      organizationId: user.organizationId,
      role: user.role,
    };
  }
}
