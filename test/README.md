# Norme de tests backend

## Nommage des fichiers de test
- **Tests unitaires** : `*.spec.ts`  
  Exemple : `user.service.spec.ts`
- **Tests d'intégration** : `*.integration-spec.ts`  
  Exemple : `user.integration-spec.ts`
- **Tests end-to-end (e2e)** : `*.e2e-spec.ts`  
  Exemple : `app.e2e-spec.ts`

## Nommage des fonctions de test
- Utiliser `describe('NomDuModule', ...)` pour regrouper les tests d'un module ou d'une fonctionnalité.
- Utiliser `it('doit faire ...', ...)` ou `test('doit faire ...', ...)` pour chaque cas de test précis.
- Les noms doivent être explicites et en français si possible.

Exemple :
```ts
describe('UserService', () => {
  it('doit créer un utilisateur', () => {
    // ...
  });
});
```

## Lancer les tests
- **Tests unitaires** :
  ```bash
  npm run test
  ```
- **Tests d'intégration** :
  ```bash
  npm run test:integration
  ```
- **Tests end-to-end (e2e)** :
  ```bash
  npm run test:e2e
  ```

> Les commandes doivent être lancées à la racine du dossier BACKEND-KONSTRUKT.
