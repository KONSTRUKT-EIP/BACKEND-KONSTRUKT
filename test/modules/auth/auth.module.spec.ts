import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService, type JwtSignOptions } from '@nestjs/jwt';

type TokenPayload = { iat: number; exp: number };

describe('AuthModule JWT configuration', () => {
  const originalAccessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN;

  afterEach(() => {
    if (originalAccessTokenExpiresIn === undefined) {
      delete process.env.ACCESS_TOKEN_EXPIRES_IN;
    } else {
      process.env.ACCESS_TOKEN_EXPIRES_IN = originalAccessTokenExpiresIn;
    }
  });

  async function signToken() {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: 'test-jwt-secret',
            signOptions: {
              expiresIn: configService.get<string>(
                'ACCESS_TOKEN_EXPIRES_IN',
                '1h',
              ) as JwtSignOptions['expiresIn'],
            },
          }),
        }),
      ],
    }).compile();

    return module.get(JwtService).signAsync({});
  }

  function getTokenPayload(token: string): TokenPayload {
    const decoded: unknown = new JwtService().decode(token);

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as Record<string, unknown>).iat !== 'number' ||
      typeof (decoded as Record<string, unknown>).exp !== 'number'
    ) {
      throw new Error(
        'JWT payload does not contain numeric iat and exp claims',
      );
    }

    return decoded as TokenPayload;
  }

  it('uses one hour by default', async () => {
    delete process.env.ACCESS_TOKEN_EXPIRES_IN;

    const token = await signToken();
    const payload = getTokenPayload(token);

    expect(payload.exp - payload.iat).toBe(60 * 60);
  });

  it('uses the configured access token lifetime', async () => {
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';

    const token = await signToken();
    const payload = getTokenPayload(token);

    expect(payload.exp - payload.iat).toBe(15 * 60);
  });
});
