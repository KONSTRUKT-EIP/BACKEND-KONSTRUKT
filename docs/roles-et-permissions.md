# Rôles et permissions par chantier

Source de vérité : [`src/shared/authorization/site-policies.ts`](../src/shared/authorization/site-policies.ts).
Ce document doit rester aligné avec ce fichier.

## Deux niveaux de rôle

| Niveau | Où est-il stocké ? | Rôles |
| --- | --- | --- |
| Organisation | `User.role` (présent dans le JWT) | `OWNER`, `ADMIN_ORGANIZATION` |
| Chantier | `SiteMembership.role` (un par chantier) | `CHEF_PROJET`, `CONDUCTEUR_TRAVAUX`, `COLLABORATEUR`, `CLIENT` |

- `OWNER` et `ADMIN_ORGANIZATION` ont un accès implicite à **tous les chantiers de
  leur organisation**, sans affectation.
- Pour les autres utilisateurs, le rôle qui compte sur un chantier est celui de
  leur `SiteMembership` actif sur **ce** chantier. Un utilisateur peut donc être
  `CHEF_PROJET` sur le chantier A et `COLLABORATEUR` sur le chantier B.
- `User.role` d'un utilisateur non administrateur sert de rôle « par défaut » pour
  les routes non liées à un chantier (listes globales, ressources par id…).

## Matrice des actions sur un chantier

| Action (`SiteAction`) | OWNER | ADMIN_ORGANIZATION | CHEF_PROJET | CONDUCTEUR_TRAVAUX | COLLABORATEUR | CLIENT |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `site.view` — voir le chantier, sa météo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `site.update` — modifier le chantier | ✅ | ✅ | ✅ | | | |
| `site.delete` — supprimer le chantier | ✅ | ✅ | | | | |
| `members.view` — voir les membres | ✅ | ✅ | ✅ | ✅ | | |
| `members.manage` — affecter / modifier / retirer | ✅ | ✅ | ✅ | | | |
| `invitations.manage` — inviter, relancer, annuler | ✅ | ✅ | ✅ | | | |
| `teams.view` — équipes, stats, présences | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `workforce.manage` — saisir les heures | ✅ | ✅ | ✅ | ✅ | | |
| `dashboard.view` — tableaux du dashboard | ✅ | ✅ | ✅ | ✅ | | |
| `dashboard.edit` — créer des tableaux | ✅ | ✅ | ✅ | ✅ | | |

## Côté front / mobile

`GET /auth/sites` renvoie pour chaque chantier accessible :

```json
{
  "id": "…",
  "name": "Résidence Les Tilleuls",
  "membershipRole": "CHEF_PROJET",
  "permissions": ["site.view", "site.update", "members.view", "members.manage", "…"]
}
```

Les écrans d'administration et l'app mobile doivent se baser sur `permissions`
pour afficher / masquer les actions, plutôt que de recoder la matrice. Le
backend reste l'autorité : toute action refusée renvoie `403`.

## Côté backend

Sur une route liée à un chantier :

```ts
@UseGuards(JwtAuthGuard, SiteAccessGuard)
@RequireSiteAccess()                       // siteId lu dans params (ou 'query' / 'body')
@SitePermission(SiteAction.MANAGE_MEMBERS) // action exigée sur CE chantier
```

`SiteAccessGuard` résout le rôle effectif (organisation ou affectation), vérifie
l'action et expose le rôle dans `request.siteRole`. Si le `siteId` est optionnel
et absent, l'action est évaluée avec `User.role` et le service filtre sur les
chantiers accessibles.

Les routes identifiées par l'id d'une entité (ressources, livraisons, planning,
présences, équipes par id…) utilisent encore `@Roles` sur le rôle global : leur
passage au contrôle par chantier demande de résoudre le chantier de l'entité et
fait l'objet d'un suivi séparé.

## Migration d'une base existante

```bash
npm run db:roles   # admin -> owner, ajoute admin_organization
npm run db:push
```
