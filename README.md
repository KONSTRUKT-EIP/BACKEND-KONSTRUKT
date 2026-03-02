# Konstrukt Backend 🏗️

## Prérequis ⚙️
- Node.js (version >= 16)
- npm (version >= 8)

## Installation 📦

1. Installer les dépendances :
```bash
npm install
```

## Base de données (PostgreSQL + Prisma) 🗄️

1. Créer un fichier `.env` à partir de l'exemple :
```bash
cp .env.example .env
```

2. Démarrer PostgreSQL en local :
```bash
docker compose up -d
```

3. Générer le client Prisma :
```bash
npm run db:generate
```

4. Créer la base et appliquer la première migration :
```bash
npm run db:migrate -- --name init
```

## Lancer le serveur en développement 🚀
```bash
npm run start:dev
```

Le backend sera accessible sur [http://localhost:3000](http://localhost:3000)

## Structure du projet 🗂️
```
src/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── sites/
│   ├── tasks/
│   ├── workforce/
│   ├── resources/
│   ├── deliveries/
│   ├── documents/
│   └── reports/
├── lib/
├── shared/
├── test/
```

## Nettoyer le projet 🧹
Pour supprimer les fichiers build :
```bash
npm run clean
```
Pour supprimer les dépendances :
```bash
rm -rf node_modules
```

## Générer un nouveau module 🧩
```bash
npx nest generate module <nom>
```

## Générer un nouveau contrôleur 🕹️
```bash
npx nest generate controller <nom>
```

## Générer un nouveau service 🛠️
```bash
npx nest generate service <nom>
```

## Liens utiles 🔗
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)

---
