import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import {
  getCorsOptions,
  parseCorsOrigins,
  resolveAllowedOrigins,
} from '../../src/config/cors.config';

@Controller('cors-test')
class CorsTestController {
  @Get('hello')
  hello() {
    return { ok: true };
  }
}

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parseCorsOrigins', () => {
    it('returns empty array when undefined, null, or empty string', () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
      expect(parseCorsOrigins(null as unknown as string)).toEqual([]);
      expect(parseCorsOrigins('')).toEqual([]);
      expect(parseCorsOrigins('   ')).toEqual([]);
    });

    it('returns "*" when input is "*"', () => {
      expect(parseCorsOrigins('*')).toBe('*');
      expect(parseCorsOrigins('  *  ')).toBe('*');
    });

    it('returns false when input is "false" or "none"', () => {
      expect(parseCorsOrigins('false')).toBe(false);
      expect(parseCorsOrigins('FALSE')).toBe(false);
      expect(parseCorsOrigins('none')).toBe(false);
      expect(parseCorsOrigins('NONE')).toBe(false);
    });

    it('parses comma-separated origins and trims spaces and slashes', () => {
      const result = parseCorsOrigins(
        'https://app.konstrukt.io/, http://localhost:5173/ ,' +
          ' https://admin.konstrukt.io',
      );
      expect(result).toEqual([
        'https://app.konstrukt.io',
        'http://localhost:5173',
        'https://admin.konstrukt.io',
      ]);
    });

    it('normalizes APP_URL-like values to their origin', () => {
      const result = parseCorsOrigins('https://app.konstrukt.io/dashboard');
      expect(result).toEqual(['https://app.konstrukt.io']);
    });

    it('returns "*" if "*" is one of the comma-separated origins', () => {
      const result = parseCorsOrigins('http://localhost:5173, *');
      expect(result).toBe('*');
    });

    it('converts wildcard subdomains into RegExp', () => {
      const result = parseCorsOrigins('https://*.konstrukt.io');
      expect(Array.isArray(result)).toBe(true);
      const [regex] = result as (string | RegExp)[];
      expect(regex).toBeInstanceOf(RegExp);
      expect((regex as RegExp).test('https://app.konstrukt.io')).toBe(true);
      expect((regex as RegExp).test('https://staging.konstrukt.io')).toBe(true);
      expect((regex as RegExp).test('https://attacker.io')).toBe(false);
      expect((regex as RegExp).test('https://konstrukt.io.attacker.com')).toBe(
        false,
      );
    });

    it('rejects unsafe wildcard host patterns', () => {
      expect(() => parseCorsOrigins('https://*konstrukt.io')).toThrow(
        'Invalid wildcard CORS origin: https://*konstrukt.io.',
      );
    });

    it('rejects origins without an http(s) scheme', () => {
      for (const origin of ['localhost:5173', 'app.konstrukt.io:443']) {
        expect(() => parseCorsOrigins(origin)).toThrow(
          `Invalid CORS origin: ${origin}.`,
        );
      }
      expect(() => parseCorsOrigins('ftp://files.konstrukt.io')).toThrow(
        'Invalid CORS origin',
      );
    });
  });

  describe('resolveAllowedOrigins', () => {
    it('prioritizes CORS_ALLOWED_ORIGINS over other variables', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'https://custom1.com, https://custom2.com';
      process.env.CORS_ORIGIN = 'https://ignored.com';
      process.env.APP_URL = 'https://ignored-app.com';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://custom1.com', 'https://custom2.com']);
    });

    it('uses CORS_ORIGIN if CORS_ALLOWED_ORIGINS is not set', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      process.env.CORS_ORIGIN = 'https://single-origin.com';
      process.env.APP_URL = 'https://ignored-app.com';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://single-origin.com']);
    });

    it('falls back to APP_URL if no CORS variable is set', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGIN;
      process.env.APP_URL = 'https://client.konstrukt.io/dashboard';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://client.konstrukt.io']);
    });

    it('skips empty env values and falls back to the next source', () => {
      process.env.CORS_ALLOWED_ORIGINS = '';
      process.env.APP_URL = 'https://client.konstrukt.io/dashboard';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://client.konstrukt.io']);
    });

    it('throws in production when no variables are set', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGIN;
      delete process.env.APP_URL;
      process.env.NODE_ENV = 'production';

      expect(() => resolveAllowedOrigins()).toThrow(
        'No CORS allowed origins configured in production',
      );
    });

    it('defaults to localhost origins in development without variables', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGIN;
      delete process.env.APP_URL;
      process.env.NODE_ENV = 'development';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual([
        'http://localhost:5173',
        'http://localhost:3000',
      ]);
    });

    it('works with ConfigService instance', () => {
      const getMock = jest.fn((key: string) => {
        if (key === 'CORS_ALLOWED_ORIGINS') return 'https://config-service.com';
        return undefined;
      });
      const mockConfigService = {
        get: getMock,
      } as unknown as ConfigService;

      const origins = resolveAllowedOrigins(mockConfigService);
      expect(origins).toEqual(['https://config-service.com']);
      expect(getMock).toHaveBeenCalledWith('CORS_ALLOWED_ORIGINS');
    });
  });

  describe('getCorsOptions', () => {
    it('sets credentials to true by default for specific origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';
      delete process.env.CORS_CREDENTIALS;

      const options = getCorsOptions();
      expect(options.origin).toEqual(['http://localhost:5173']);
      expect(options.credentials).toBe(true);
      expect(options.methods).toContain('GET');
      expect(options.methods).toContain('POST');
    });

    it('sets credentials to false when origin is "*"', () => {
      process.env.CORS_ALLOWED_ORIGINS = '*';
      delete process.env.CORS_CREDENTIALS;

      const options = getCorsOptions();
      expect(options.origin).toBe('*');
      expect(options.credentials).toBe(false);
    });

    it('allows overriding credentials and methods via environment', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';
      process.env.CORS_CREDENTIALS = 'false';
      process.env.CORS_METHODS = 'GET,POST';
      process.env.CORS_ALLOWED_HEADERS = 'Content-Type,Authorization';
      process.env.CORS_EXPOSED_HEADERS = 'X-Total-Count';
      process.env.CORS_MAX_AGE = '3600';

      const options = getCorsOptions();
      expect(options.credentials).toBe(false);
      expect(options.methods).toEqual(['GET', 'POST']);
      expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization']);
      expect(options.exposedHeaders).toEqual(['X-Total-Count']);
      expect(options.maxAge).toBe(3600);
    });
  });

  describe('NestJS HTTP Integration', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'http://localhost:5173, https://app.konstrukt.io,' +
        ' https://*.preview.konstrukt.io';

      const moduleRef = await Test.createTestingModule({
        controllers: [CorsTestController],
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableCors(getCorsOptions());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('allows configured origin and sends CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test/hello')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('allows request matching wildcard origin pattern', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test/hello')
        .set('Origin', 'https://feat-branch.preview.konstrukt.io')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://feat-branch.preview.konstrukt.io',
      );
    });

    it('omits Allow-Origin header for unauthorized origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test/hello')
        .set('Origin', 'http://malicious-website.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('answers allowed preflight with 204 and CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .options('/cors-test/hello')
        .set('Origin', 'https://app.konstrukt.io')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://app.konstrukt.io',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('omits Allow-Origin header for unauthorized preflight', async () => {
      const response = await request(app.getHttpServer())
        .options('/cors-test/hello')
        .set('Origin', 'http://malicious-website.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('permits non-browser requests without Origin header', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test/hello')
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
