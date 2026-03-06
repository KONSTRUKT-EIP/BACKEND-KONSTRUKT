#!/bin/bash

set -e

# Usage: ./run.sh [backend|clean|cs]

if [ "$1" = "backend" ]; then
  echo "[Konstrukt BACKEND] Démarrage du backend et de la base Postgres via Docker Compose..."
  if [ "$2" = "--no-build" ]; then
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      docker compose up -d
    elif command -v docker-compose >/dev/null 2>&1; then
      docker-compose up -d
    fi
    echo "[Konstrukt BACKEND] Les services sont lancés (sans rebuild)"
  else
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      docker compose up -d --build
    elif command -v docker-compose >/dev/null 2>&1; then
      docker-compose up -d --build
    fi
    echo "[Konstrukt BACKEND] Les services sont lancés (avec rebuild)"
  fi
  echo "[Konstrukt BACKEND] Accès API : http://localhost:3000"
  echo "[Konstrukt BACKEND] Accès DB : postgresql://konstrukt:konstrukt@localhost:5432/konstrukt"
  echo "[Konstrukt BACKEND] Pour arrêter les services : ./run.sh stop"
  echo "[Konstrukt BACKEND] Pour voir les logs : docker compose logs -f"
elif [ "$1" = "build" ]; then
  echo "[Konstrukt BACKEND] Build des images Docker..."
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose build
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose build
  else
    echo "[Konstrukt BACKEND] Docker Compose introuvable. Installe Docker + Compose."
    exit 1
  fi
elif [ "$1" = "clean" ]; then
  echo "[Konstrukt BACKEND] Clean du backend..."
  rm -rf dist
  rm -rf node_modules
  echo "[Konstrukt BACKEND] Clean terminé."
elif [ "$1" = "cs" ]; then
  echo "[Konstrukt BACKEND] Lint du code avec ESLint..."
  npx eslint 'src/**/*.ts'
elif [ "$1" = "cs:fix" ]; then
  echo "[Konstrukt BACKEND] Correction automatique du coding style..."
  npx eslint 'src/**/*.ts' --fix
  echo "[Konstrukt BACKEND] Vérification que la compilation TypeScript est toujours valide..."
  if npx tsc --noEmit; then
    echo "[Konstrukt BACKEND] Coding style corrigé et compilation OK."
  else
    echo "[Konstrukt BACKEND] ESLint a introduit des erreurs de compilation. Vérification des changements..."
    exit 1
  fi
elif [ "$1" = "test" ]; then
  echo "[Konstrukt BACKEND] Exécution des tests..."
  npm test
elif [ "$1" = "test:e2e" ]; then
  echo "[Konstrukt BACKEND] Exécution des tests e2e..."
  npm run test:e2e
elif [ "$1" = "test:cov" ]; then
  echo "[Konstrukt BACKEND] Exécution des tests avec couverture..."
  npm run test:cov
elif [ "$1" = "stop" ]; then
  echo "[Konstrukt BACKEND] Arrêt de tous les services Docker Compose..."
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose down
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
  fi
  echo "[Konstrukt BACKEND] Tous les services sont arrêtés"
else
  echo "Usage: ./run.sh backend | build | clean | cs | cs:fix | test | test:e2e | test:cov | stop"
  exit 1
fi
