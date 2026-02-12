#!/usr/bin/env bash
# Stage everything, commit, push to main. GitHub Actions will build and republish the site.
# Usage: ./scripts/push.sh [commit message] [--force]
#   If no message is given, uses "Update and republish"
#   Use --force only after a history rewrite (e.g. to replace remote with cleaned history)
set -e
cd "$(dirname "$0")/.."

FORCE_PUSH=
MSG="Update and republish"
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    FORCE_PUSH=1
  else
    MSG="$arg"
  fi
done

git add -A
if ! git diff --staged --quiet; then
  git commit -m "$MSG"
fi

if [ ! -f .env ]; then
  echo "No .env file. Copy .env.example to .env and paste your GitHub token after GITHUB_TOKEN="
  exit 1
fi
# shellcheck disable=SC1091
source .env
# Trim newlines/carriage return (common when pasting token)
GITHUB_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is empty in .env. Paste your token after GITHUB_TOKEN="
  exit 1
fi
ORIGIN=$(git remote get-url origin)
git remote set-url origin "https://jelliottdev:${GITHUB_TOKEN}@github.com/jelliottdev/guided-bankruptcy-intake.git"
if ! git push origin main ${FORCE_PUSH:+--force}; then
  git remote set-url origin "$ORIGIN"
  echo ""
  echo "Push failed. Check: .env has a valid token (repo scope), not expired. Create one at https://github.com/settings/tokens"
  exit 1
fi
git remote set-url origin "$ORIGIN"
echo "Pushed to main. GitHub Actions will build and republish the site."
