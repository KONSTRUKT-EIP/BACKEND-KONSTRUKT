# AGENTS.md — Guide de travail pour les IA

Backend NestJS 11 + Prisma 6 + PostgreSQL pour Konstrukt. Lire ce fichier en entier avant toute modification.

## 1. Règles d'or

1. Lire ce document, puis les fichiers directement liés à la tâche (contrôleur, service, DTO, guards, tests du module).
2. Modifier le strict nécessaire : pas de refactor opportuniste, pas de reformatage hors sujet, pas de renommage inutile.
3. Préserver les contrats API (payloads d'entrée/sortie) sauf demande explicite. Toute rupture est documentée dans le journal.
4. Ne jamais inventer un fichier, une route, un script ou un champ Prisma : vérifier qu'il existe.
5. En cas de contradiction, la consigne de l'utilisateur prime sur ce document ; documenter l'écart dans le journal.
6. Si une réponse à « quel module, quel contrat, quels fichiers, quels tests ? » est floue, explorer avant de coder.

## 2. Architecture

- `src/main.ts` : bootstrap, `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform` = true), CORS (`src/config/cors.config.ts`), Swagger sur `/api`, throttling global.
- `src/app.module.ts` : assemblage des modules. `src/config/` : configuration transversale.
- `src/lib/prisma/` : module et service Prisma. `prisma/schema.prisma`, `prisma/seed.ts`.
- `src/shared/` : types, middlewares, erreurs, autorisation, utilitaires.
- `src/modules/` : auth, users, organizations, sites, teams, attendance, planning, resources, resource-usages, deliveries, invitations, site-memberships, dashboard, weather.
- `test/` : unitaires, intégration, e2e (`test/modules/...` par domaine).

Ne pas déplacer de fichiers, fusionner des modules ni dupliquer une logique existante.

## 3. Conventions NestJS

- Logique métier dans les **services** ; contrôleurs fins (orchestration HTTP uniquement) ; DTO = validation + Swagger, jamais de logique métier.
- Réutiliser les guards, décorateurs et helpers existants. Ne pas contourner le `ValidationPipe`.
- Toute nouvelle route : stratégie d'accès explicite (JWT + rôles), documentée Swagger.
- Suivre le style du fichier ciblé (indentation, imports). Ne pas réorganiser les imports sans nécessité.

## 4. Multi-tenant (critique)

L'application est multi-organisation. Une fuite entre organisations est un bug de sécurité.

- Toute méthode de service qui lit ou écrit des données métier reçoit un `organizationId` issu de l'utilisateur authentifié, **jamais** des query params ou du body.
- L'appliquer dans chaque `where` Prisma, directement (`organizationId`) ou via la relation (`site.organizationId`, `resource.site.organizationId`).
- Ressource hors organisation → `NotFoundException` (pas 403, pour ne pas révéler son existence).
- Applicable à `findAll`, `findOne`, `create`, `update`, `remove` et à toute méthode dérivée (listes, agrégats, commandes, etc.).
- Dans `create`/`update`, vérifier que chaque ID référencé (site, resource, user…) appartient bien à l'organisation.

## 5. Règles de cohérence des données

- **Update partiel** : valider les relations sur les valeurs *effectives* (`dto.x ?? existant.x`), pas seulement sur celles envoyées. Exemple : si `dto.siteId` est fourni sans `resourceId`, le comparer au `siteId` de la ressource existante. Mêmes règles dans `create` et `update`.
- **Transitions de statut** : centraliser dans le service, rejeter les transitions interdites avec une erreur explicite, gérer les champs dérivés (ex. `receivedDate` auto à `now` si non fourni).
- **Typage Prisma** : pas d'accès dynamique `where[champ] = ...` (casse sous `strict`). Utiliser un `switch` ou un helper typé qui assigne `where.createdAt`, `where.expectedDate`, etc.

## 6. Prisma

Avant de modifier `schema.prisma`, vérifier : services, DTO, seed, tests, enums/relations partagés, cascades et index.

- Ne pas renommer un champ ni changer une relation sans vérifier tous les consommateurs.
- Réutiliser un enum existant plutôt qu'en créer un.
- Régénérer le client Prisma après changement de schéma.
- Entités principales : `Organization`, `User`, `Site`, `Invitation`, `SiteMembership`, `Resource`, `Delivery`, `Task`, `Report`, `Attendance`.

## 7. Messages et langue

- Messages d'erreur et textes utilisateur de l'API : **français, avec accents** (« réception », « autorisée », « supprimée », « paginée », « introuvable »).
- Terminologie métier en français : « Livraison », « Ressource », « Site ».
- Ne pas mélanger anglais et français dans une même API. Code, noms de variables et commentaires techniques restent en anglais.
- Avant de changer un message, vérifier qu'aucun test ne l'attend.

## 8. Sécurité

- Valider toute donnée utilisateur avant usage.
- Secrets uniquement dans les variables d'environnement ; rien dans le repo.
- Aucun token, mot de passe ou donnée sensible dans les logs.

## 9. Tests

- Toute nouvelle logique métier (transitions, règles de cohérence, scoping organisation) vient avec des tests Jest.
- Cas minimum : chemin nominal, cas interdit, valeur par défaut/dérivée, accès cross-organisation refusé.
- Exécuter les tests ciblés du module après modification. Compilation TypeScript si le changement est structurel.
- Les scripts exacts sont dans `package.json` : ne pas en supposer.

## 10. Travail en parallèle (plusieurs IA / outils en même temps)

Plusieurs IA (Copilot, Claude, Cursor, Codex…) peuvent travailler simultanément. Ce fichier est neutre vis-à-vis des outils : les règles s'appliquent à toutes.

- **Une tâche = une branche = une PR** (`ai/<outil>/<sujet-court>`). Jamais de commit direct sur `main`.
- **Périmètre exclusif** : une IA reste dans les fichiers de son module. Si un fichier hors périmètre doit changer, le signaler dans la PR au lieu de le modifier.
- **Fichiers à haut risque de conflit** — ne les toucher que si la tâche l'exige, avec un changement minimal et ciblé :
  `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `package.json`, lockfile, `src/app.module.ts`, `src/main.ts`, `src/shared/`.
- **Prisma** : une seule IA à la fois modifie le schéma. Ne jamais éditer ni renommer une migration existante ; ne pas committer de migration en conflit avec une autre branche.
- **Dépendances** : ne pas ajouter ou mettre à jour de package sans demande explicite.
- **Avant de commencer et avant de pousser** : se rebaser sur `main` à jour. En cas de conflit, ne jamais écraser le travail d'une autre branche : résoudre en conservant les deux intentions, ou s'arrêter et signaler.
- **Ne pas éditer `AGENTS.md` pour un simple journal** : utiliser un fichier dédié (voir Journal). `AGENTS.md` ne change que pour une règle durable.
- **Petites PR** : un sujet par PR (ex. scoping organisation, puis tests, puis messages), plus faciles à relire et à fusionner.
- Ne pas défaire ou « corriger » le code d'une autre IA hors de la tâche en cours.

## 11. Mise à jour de ce document

Mettre à jour ce fichier et le journal quand un changement touche : architecture, modules, auth/autorisation, validation, Prisma/seed, scripts npm, variables d'environnement, stratégie de test ou convention durable.

Règle pratique : si une IA future pouvait se tromper en lisant seulement le dépôt, documenter ici.
Modification purement locale (faute de frappe, doc) : pas de refactor, journal facultatif.

## 12. Checklists

**Avant de coder** : document lu · branche dédiée à jour avec `main` · fichiers du domaine ouverts · impacts API/DTO/tests/Prisma/tenant évalués · plus petit changement possible.

**Fin de tâche** : code cohérent · scoping organisation vérifié · tests exécutés ou justifiés · aucun fichier hors périmètre modifié · entrée de journal créée · la prochaine IA peut reprendre sans l'historique de conversation.

---

## Journal des changements

Pour éviter les conflits de merge entre IA parallèles, **le journal n'est plus dans ce fichier**.

- Créer un fichier par changement significatif : `docs/ai-journal/AAAA-MM-JJ-<outil>-<sujet>.md`.
- Ne jamais modifier l'entrée d'une autre IA.
- Contenu (5 lignes max) : Date · IA · Fichiers · Résumé · Points d'attention / suite à donner.
- Lire les 5 entrées les plus récentes de `docs/ai-journal/` avant de commencer.

### Historique
- 2026-10-14 · Copilot : création du guide de référence puis version renforcée.
- 2026-10-14 · Claude : version condensée ; sections multi-tenant, cohérence des données, langue des messages, tests ; règles de travail multi-IA en parallèle et journal éclaté par fichier. Le module `deliveries` doit être aligné sur ces règles (organizationId, validation `siteId`/`resourceId` en update, messages en français accentué, tests de transitions).