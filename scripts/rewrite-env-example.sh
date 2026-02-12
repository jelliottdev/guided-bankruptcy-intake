#!/usr/bin/env bash
# Overwrite .env.example with safe placeholder in current tree (for filter-branch).
set -e
if [ -f .env.example ]; then
  cat > .env.example << 'ENVEXAMPLE'
# Copy this file to .env and paste your GitHub token after the =
# Get a token: GitHub → Settings → Developer settings → Personal access tokens
# Required scope: repo
# .env is gitignored — never commit it.

GITHUB_TOKEN=paste-your-token-here
ENVEXAMPLE
fi
