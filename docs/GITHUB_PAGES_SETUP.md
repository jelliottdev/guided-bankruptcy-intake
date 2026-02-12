# GitHub Pages deployment

The app is deployed to GitHub Pages by **GitHub Actions** when you push to `main`.

## One-time setup

1. In the repo: **Settings** → **Pages** (under "Code and automation").
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
3. Save.

After that, each push to `main` runs the workflow: lint, build, then deploy. The site updates a few minutes after the workflow completes.

**Live site:** https://jelliottdev.github.io/guided-bankruptcy-intake/

## Deploy (after setup)

```bash
git push origin main
```

Open the **Actions** tab to see the "Deploy to GitHub Pages" workflow. No manual build or copy step needed.

## Manual deploy (alternative)

If you prefer to serve from the branch root instead of Actions:

1. **Settings** → **Pages** → **Source**: **Deploy from a branch**.
2. **Branch:** `main`, **Folder:** `/(root)`.
3. Locally, build and copy output to repo root, then push:

   ```bash
   npm run deploy
   git add index.html assets/
   git commit -m "Deploy"
   git push origin main
   ```

With this option, the site only updates when you run `npm run deploy` and push the generated files.
