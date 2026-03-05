import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type userPayload = {
  userId: string;
  role: UserRole;
};
export type requestWithUser = { user: userPayload };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: userPayload): userPayload {
    return { userId: payload.userId, role: payload.role };
  }
}
