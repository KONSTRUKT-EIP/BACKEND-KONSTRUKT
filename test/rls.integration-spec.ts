import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

describe('RLS', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('toutes les tables publiques ont la RLS activée', async () => {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = false`;
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });
});
