# Guided Bankruptcy Intake

**Live demo:** [jelliottdev.github.io/guided-bankruptcy-intake](https://jelliottdev.github.io/guided-bankruptcy-intake/)

TurboTax-style guided bankruptcy intake that replaces paper packets with a step-by-step smart questionnaire. Designed to help attorneys collect complete, structured client information and documents with less follow-up.

This repository contains a prototype guided intake flow for attorney review and pilot testing.

---

## Overview

Guided Bankruptcy Intake is a client-facing intake wizard that:

- Replaces paper bankruptcy intake packets
- Uses short, guided question screens
- Applies conditional branching logic
- Prompts for documents by topic
- Standardizes intake data collection
- Improves client completion rates

The focus is usability, coverage, and flow clarity before production integrations.

---

## Intake Flow

High-level sections:

1. Filing setup (individual or joint)
2. Debtor and spouse information
3. Urgency and risk flags
4. Assets and property
5. Debts and creditors
6. Income and employment
7. Monthly expenses
8. Recent financial activity
9. Document uploads
10. Final review

---

## Purpose

- Reduce incomplete intakes  
- Reduce staff follow-up time  
- Eliminate handwritten packet errors  
- Improve client experience  
- Create structured intake data  

---

## Status

Prototype UI and logic flow for demonstration and feedback.  
Not production-ready for sensitive legal data.

---

## Development

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview production build locally
```

---

## Deploy to GitHub Pages

1. **Enable GitHub Pages** (one-time): In the repo go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.

2. **Push using a token** (no password needed):
   - Open **.env** and paste your [GitHub Personal Access Token](https://github.com/settings/tokens) after `GITHUB_TOKEN=` (create a token with `repo` scope; use Google login on GitHub, then Settings → Developer settings → Personal access tokens).
   - Run: `./scripts/push.sh`  
   The script pushes to `main` and restores your remote URL. `.env` is gitignored and never committed.

3. **Live site**: After the workflow runs, the app is at  
   **https://jelliottdev.github.io/guided-bankruptcy-intake/**

---

## Roadmap

- [x] Guided multi-step intake UI
- [x] Conditional branching logic
- [x] Full bankruptcy intake question coverage
- [x] Section-based document upload prompts
- [x] Client autosave
- [x] Progress and completeness tracking
- [ ] Attorney review mode
- [ ] Magic link client access
- [ ] Secure document storage
- [ ] Attorney dashboard

---

## Notes

This prototype is intended for workflow validation and attorney feedback before adding authentication, storage, and security layers.
