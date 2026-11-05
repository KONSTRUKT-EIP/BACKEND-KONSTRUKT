import { PrismaClient } from '@prisma/client';
import { seedDemoLots } from './demo/lots';

// Ajoute les lots de démonstration aux chantiers qui n'en ont pas encore.
// Contrairement à seed.ts, ce script n'efface aucune donnée existante.
const prisma = new PrismaClient();

async function main() {
  const sites = await prisma.site.findMany({
    where: { lots: { none: {} } },
    select: { id: true, name: true },
  });

  if (sites.length === 0) {
    console.log('Tous les chantiers ont déjà des lots, rien à faire.');
    return;
  }

  for (const site of sites) {
    await seedDemoLots(prisma, site.id);
    console.log(`Lots de démo ajoutés : ${site.name}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed des lots échoué :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
