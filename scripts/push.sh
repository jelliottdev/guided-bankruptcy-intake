#!/usr/bin/env bash
# Push to GitHub using GITHUB_TOKEN from .env (never commit .env)
set -e
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  echo "No .env file. Copy .env.example to .env and paste your GitHub token after GITHUB_TOKEN="
  exit 1
fi
# shellcheck disable=SC1091
source .env
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is empty in .env. Paste your token after GITHUB_TOKEN="
  exit 1
fi
ORIGIN=$(git remote get-url origin)
git remote set-url origin "https://jelliottdev:${GITHUB_TOKEN}@github.com/jelliottdev/guided-bankruptcy-intake.git"
git push origin main
git remote set-url origin "$ORIGIN"
echo "Pushed to main. GitHub Actions will deploy to Pages."
