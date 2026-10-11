import { Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

/**
 * Parses raw CORS origins string into an array of allowed origins (strings or RegExps),
 * a wildcard string '*', or boolean false (CORS disabled/denied).
 */
export function parseCorsOrigins(
  rawOrigins?: string,
): (string | RegExp)[] | string | boolean {
  if (rawOrigins === undefined || rawOrigins === null) {
    return [];
  }

  const trimmed = rawOrigins.trim();
  if (trimmed === '') {
    return [];
  }

  if (trimmed === '*') {
    return '*';
  }

  if (trimmed.toLowerCase() === 'false' || trimmed.toLowerCase() === 'none') {
    return false;
  }

  const origins = trimmed
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  if (origins.includes('*')) {
    return '*';
  }

  return origins.map((origin) => {
    if (origin.includes('*')) {
      const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escaped.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`);
    }
    return origin;
  });
}

/**
 * Resolves allowed CORS origins based on configuration service or environment variables.
 * Priority:
 * 1. CORS_ALLOWED_ORIGINS
 * 2. CORS_ORIGIN
 * 3. APP_URL
 * 4. Fallback based on NODE_ENV (production: https://app.konstrukt.io, non-production: localhost:5173, localhost:3000)
 */
export function resolveAllowedOrigins(
  configService?: ConfigService,
): (string | RegExp)[] | string | boolean {
  const getEnv = (key: string): string | undefined => {
    return configService?.get<string>(key) ?? process.env[key];
  };

  const corsAllowedOrigins = getEnv('CORS_ALLOWED_ORIGINS');
  if (corsAllowedOrigins !== undefined) {
    return parseCorsOrigins(corsAllowedOrigins);
  }

  const corsOrigin = getEnv('CORS_ORIGIN');
  if (corsOrigin !== undefined) {
    return parseCorsOrigins(corsOrigin);
  }

  const appUrl = getEnv('APP_URL');
  if (appUrl !== undefined && appUrl.trim() !== '') {
    return parseCorsOrigins(appUrl);
  }

  const nodeEnv = getEnv('NODE_ENV');
  if (nodeEnv === 'production') {
    Logger.warn(
      'No CORS allowed origins configured in production. Defaulting to https://app.konstrukt.io',
      'CorsConfig',
    );
    return ['https://app.konstrukt.io'];
  }

  return ['http://localhost:5173', 'http://localhost:3000'];
}

/**
 * Builds the CorsOptions object for NestJS application enableCors().
 */
export function getCorsOptions(configService?: ConfigService): CorsOptions {
  const getEnv = (key: string): string | undefined => {
    return configService?.get<string>(key) ?? process.env[key];
  };

  const allowedOrigins = resolveAllowedOrigins(configService);

  const credentialsEnv = getEnv('CORS_CREDENTIALS');
  const credentials =
    credentialsEnv !== undefined
      ? credentialsEnv.toLowerCase() === 'true'
      : allowedOrigins !== '*' && allowedOrigins !== false;

  const methodsEnv = getEnv('CORS_METHODS');
  const methods = methodsEnv
    ? methodsEnv
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
    : ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];

  const allowedHeadersEnv = getEnv('CORS_ALLOWED_HEADERS');
  const allowedHeaders = allowedHeadersEnv
    ? allowedHeadersEnv
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0)
    : undefined;

  const exposedHeadersEnv = getEnv('CORS_EXPOSED_HEADERS');
  const exposedHeaders = exposedHeadersEnv
    ? exposedHeadersEnv
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0)
    : undefined;

  const maxAgeEnv = getEnv('CORS_MAX_AGE');
  const maxAge = maxAgeEnv ? Number(maxAgeEnv) : undefined;

  return {
    origin: allowedOrigins,
    credentials,
    methods,
    ...(allowedHeaders !== undefined ? { allowedHeaders } : {}),
    ...(exposedHeaders !== undefined ? { exposedHeaders } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

