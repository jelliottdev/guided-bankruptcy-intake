# GitHub Pages: Deploy on every push (recommended)

The site is built and deployed by **GitHub Actions** when you push to `main`. No manual deploy step.

## One-time setup

1. In the repo go to **Settings** → **Pages** (under "Code and automation").
2. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not "Deploy from a branch").
3. Save. You do not need to pick a branch or folder.

After that, every push to `main` runs the workflow: it builds the app, uploads the `dist/` output, and GitHub Pages serves it. The site updates a minute or two after the workflow finishes.

## Deploy (after setup)

```bash
git add -A
git commit -m "Your message"
git push origin main
```

Then open **Actions** in the repo and wait for **"Deploy to GitHub Pages"** to complete. The live site will update shortly after.

**Live site:** https://jelliottdev.github.io/guided-bankruptcy-intake/

---

## Alternative: Deploy from branch (manual)

If you prefer to serve from the branch root instead of GitHub Actions:

1. **Settings** → **Pages** → **Source**: **Deploy from a branch**.
2. **Branch:** `main`, **Folder:** `/(root)`.
3. Locally, build and copy output to repo root, then push:
   ```bash
   npm run deploy
   git add index.html assets/
   git commit -m "Deploy"
   git push origin main
   ```

With this option, pushing only source code does **not** update the site; you must run `npm run deploy` and push the generated `index.html` and `assets/` each time.
