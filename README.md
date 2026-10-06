# Konstrukt Backend 🏗️

## Prérequis ⚙️
- Node.js (version >= 16)
- npm (version >= 8)

## Installation 📦

1. Installer les dépendances :
```bash
npm install
```

## Base de données (Supabase + Prisma) 🗄️

1. Créer un fichier `.env` à partir de l'exemple :
```bash
cp .env.example .env
```

2. Renseigner `DATABASE_URL` avec la chaîne de connexion PostgreSQL Supabase.

3. Générer le client Prisma :
```bash
npm run db:generate
```

4. Synchroniser le schéma avec Supabase :
```bash
npm run db:push
```

5. Remplir la base avec les données démo :
```bash
npm run db:seed
```

Le backend n'utilise plus de migrations Prisma dans ce workflow. Le schéma est synchronisé directement avec Supabase via `db push`, puis la base est peuplée avec le seed demo.

## Lancer le serveur en développement 🚀
```bash
npm run start:dev
```

Le backend sera accessible sur [http://localhost:3000](http://localhost:3000)

## Emails d'invitation avec Brevo

Le développement local utilise par défaut `MAIL_PROVIDER=console` et simule
l'envoi dans les logs. Pour activer Brevo, renseigner dans `.env` :

```env
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-...
MAIL_FROM_EMAIL=konstrukt.compagnie@gmail.com
MAIL_FROM_NAME=Konstrukt
APP_URL=httphttp://localhost:8081
BREVO_INVITATION_TEMPLATE_ID=2
```

Dans Brevo, le domaine d'envoi doit être vérifié avant utilisation. Les
enregistrements SPF et DKIM fournis par Brevo doivent être ajoutés au DNS.
Le mode `console` est refusé lorsque `NODE_ENV=production`.

Pour tester sans compte Brevo :

```bash
MAIL_PROVIDER=console npm run start:dev
```

La clé API ne doit jamais être ajoutée au dépôt.

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
