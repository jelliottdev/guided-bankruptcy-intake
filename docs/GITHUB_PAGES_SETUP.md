# Fix “There isn’t a GitHub Pages site here” (404)

Your workflow is already set up. You only need to turn on Pages and point it at Actions.

## Steps

1. On GitHub, open: **https://github.com/jelliottdev/guided-bankruptcy-intake**
2. Click **Settings** (repo tab, not your profile settings).
3. In the left sidebar, under **“Code and automation”**, click **Pages**.
4. Under **“Build and deployment”** → **Source**, choose **GitHub Actions** (not “Deploy from a branch”).
5. Do not change anything else. The workflow in this repo will build and deploy.

## After that

- **Automatic:** The next push to `main` will run the “Deploy to GitHub Pages” workflow and update the site.
- **Manual:** **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (to deploy the current `main` without a new push).

Your site will be at: **https://jelliottdev.github.io/guided-bankruptcy-intake/**
