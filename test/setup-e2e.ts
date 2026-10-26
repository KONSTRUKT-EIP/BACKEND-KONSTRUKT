import 'dotenv/config';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be defined for e2e tests');
}
