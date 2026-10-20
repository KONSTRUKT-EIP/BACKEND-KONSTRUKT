import { Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

type CorsOrigin = string | RegExp;
type CorsOriginValue = CorsOrigin[] | string | boolean;

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
];

function getEnvValue(
  configService: ConfigService | undefined,
  key: string,
): string | undefined {
  return configService?.get<string>(key) ?? process.env[key];
}

function parseCommaSeparatedList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/+$/, '');

  if (trimmed.includes('*')) {
    return trimmed;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

/**
 * Parses raw CORS origins string into an array of allowed origins (strings or RegExps),
 * a wildcard string '*', or boolean false (CORS disabled/denied).
 */
export function parseCorsOrigins(rawOrigins?: string): CorsOriginValue {
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

  const origins = parseCommaSeparatedList(trimmed).map(normalizeOrigin);

  if (origins.includes('*')) {
    return '*';
  }

  return origins.map((origin) => {
    if (origin.includes('*')) {
      if (!/^https?:\/\/\*\.[^/*.:]+(?:\.[^/*.:]+)*(?::\d+)?$/.test(origin)) {
        throw new Error(
          `Invalid wildcard CORS origin: ${origin}. Use a subdomain wildcard such as https://*.example.com`,
        );
      }

      const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escaped.replace(/\*/g, '[a-z0-9-]+');
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
): CorsOriginValue {
  const resolveConfiguredOrigins = (
    key: string,
  ): CorsOriginValue | undefined => {
    const rawValue = getEnvValue(configService, key);

    if (rawValue === undefined) {
      return undefined;
    }

    const parsed = parseCorsOrigins(rawValue);

    if (
      Array.isArray(parsed) &&
      parsed.length === 0 &&
      rawValue.trim() === ''
    ) {
      Logger.warn(
        `${key} is defined but empty. Falling back to the next CORS source.`,
        'CorsConfig',
      );
      return undefined;
    }

    return parsed;
  };

  const corsAllowedOrigins = resolveConfiguredOrigins('CORS_ALLOWED_ORIGINS');
  if (corsAllowedOrigins !== undefined) {
    return corsAllowedOrigins;
  }

  const corsOrigin = resolveConfiguredOrigins('CORS_ORIGIN');
  if (corsOrigin !== undefined) {
    return corsOrigin;
  }

  const appUrl = resolveConfiguredOrigins('APP_URL');
  if (appUrl !== undefined) {
    return appUrl;
  }

  const nodeEnv = getEnvValue(configService, 'NODE_ENV');
  if (nodeEnv === 'production') {
    throw new Error('No CORS allowed origins configured in production');
  }

  return DEFAULT_LOCAL_ORIGINS;
}

/**
 * Builds the CorsOptions object for NestJS application enableCors().
 */
export function getCorsOptions(configService?: ConfigService): CorsOptions {
  const allowedOrigins = resolveAllowedOrigins(configService);

  const credentialsEnv = getEnvValue(configService, 'CORS_CREDENTIALS');
  const credentials =
    credentialsEnv !== undefined
      ? credentialsEnv.toLowerCase() === 'true'
      : allowedOrigins !== '*' && allowedOrigins !== false;

  const methodsEnv = getEnvValue(configService, 'CORS_METHODS');
  const methods = methodsEnv
    ? parseCommaSeparatedList(methodsEnv)
    : ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];

  const allowedHeadersEnv = getEnvValue(configService, 'CORS_ALLOWED_HEADERS');
  const allowedHeaders = allowedHeadersEnv
    ? parseCommaSeparatedList(allowedHeadersEnv)
    : undefined;

  const exposedHeadersEnv = getEnvValue(configService, 'CORS_EXPOSED_HEADERS');
  const exposedHeaders = exposedHeadersEnv
    ? parseCommaSeparatedList(exposedHeadersEnv)
    : undefined;

  const maxAgeEnv = getEnvValue(configService, 'CORS_MAX_AGE');
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
