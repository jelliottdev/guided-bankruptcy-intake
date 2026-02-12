# GitHub Pages: Deploy from branch main (root)

The site is built and served from the **root of the main branch**.

## One-time setup

1. **GitHub** → repo **Settings** → **Pages** (under "Code and automation").
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. **Branch**: `main` (or your default branch).
4. **Folder**: `/(root)`.
5. Save.

## Deploy

1. Run: `npm run deploy`  
   (Builds and copies `dist/` to repo root as `index.html` and `assets/`.)
2. Commit and push:  
   `git add index.html assets/ && git commit -m "Deploy" && ./scripts/push.sh`  
   (Or push however you normally do.)

## Live site

**https://jelliottdev.github.io/guided-bankruptcy-intake/**
