#!/usr/bin/env bash
# Build and copy output to repo root for GitHub Pages (Deploy from branch main / root)
set -e
cd "$(dirname "$0")/.."
cp index.source.html index.html
npm run build
cp dist/index.html index.html
rm -rf assets
cp -r dist/assets assets
echo "Done. Commit index.html and assets/ then push to deploy."
