#!/bin/bash

set -e

# Usage: ./run.sh [backend|clean]

if [ "$1" = "backend" ]; then
  echo "[Konstrukt BACKEND] Installation des dépendances backend..."
  npm install
  echo "[Konstrukt BACKEND] Lancement du backend..."
  npm run start:dev
elif [ "$1" = "clean" ]; then
  echo "[Konstrukt BACKEND] Clean du backend..."
  rm -rf dist
  echo "[Konstrukt BACKEND] Clean terminé."
else
  echo "Usage: ./run.sh backend | clean"
  exit 1
fi
