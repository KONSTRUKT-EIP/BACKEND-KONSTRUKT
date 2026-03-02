#!/bin/bash

set -e

# Usage: ./run.sh [backend|clean|cs]

if [ "$1" = "backend" ]; then
  echo "[Konstrukt BACKEND] Installation des dépendances backend..."
  npm install
  echo "[Konstrukt BACKEND] Lancement du backend..."
  npm run start:dev
elif [ "$1" = "clean" ]; then
  echo "[Konstrukt BACKEND] Clean du backend..."
  rm -rf dist
  rm -rf node_modules
  echo "[Konstrukt BACKEND] Clean terminé."
elif [ "$1" = "cs" ]; then
  echo "[Konstrukt BACKEND] Lint du code avec ESLint..."
  npx eslint 'src/**/*.ts'
else
  echo "Usage: ./run.sh backend | clean | cs"
  exit 1
fi
