# Guided Bankruptcy Intake

A TurboTax-style guided intake for bankruptcy: a step-by-step client questionnaire plus an **Attorney View** dashboard for case triage, readiness, and next actions.

**Live demo:** [jelliottdev.github.io/guided-bankruptcy-intake](https://jelliottdev.github.io/guided-bankruptcy-intake/)

---

## What this is

- **Client flow** — Multi-step wizard: filing setup, debtor/spouse info, urgency, assets, debts, income, expenses, document uploads, final review. Conditional branching and autosave.
- **Attorney View** — Dashboard with case status, AI summary, action queue (blocks filing / important / follow-up), document sufficiency, schedules coverage, financial signals, timeline, and quick actions (checklist, doc request, follow-up questions).

Built for workflow validation and attorney feedback. Not production-ready for sensitive data.

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite** (build and dev server)
- No backend: state and uploads live in memory/localStorage for the prototype

---

## Project structure

```
src/
  App.tsx              # Root: client wizard vs attorney dashboard, routing
  main.tsx             # Entry, error boundary
  index.css            # Global + attorney dashboard styles

  form/                # Intake definition and validation
    steps.ts           # Step and field definitions, visibility logic
    types.ts           # Answers, flags, field value types
    validate.ts        # Required-field and step-level validation
    defaults.ts        # Default answers

  state/               # Global state
    IntakeProvider.tsx # Context: answers, uploads, flags, step, autosave
    autosave.ts        # Debounced persist to localStorage

  ui/                  # Client-facing UI
    Layout.tsx         # Shell, nav, save status
    StepShell.tsx      # Per-step container, next/back
    FieldRenderer.tsx  # Renders one field by type
    Progress.tsx       # Step progress
    Review.tsx         # Final review step

  ui/AttorneyDashboard.tsx   # Attorney View: status, queue, docs, schedules, actions

  attorney/            # Attorney logic (no UI)
    readiness.ts       # Case readiness %, bands, primary blockers
    snapshot.ts        # Case summary, strategy signals, schedule coverage,
                       # doc sufficiency, follow-up questions, timeline, checklists
    clientReliability.ts  # Reliability score and breakdown
    creditorMatrix.ts     # Creditor list and worksheet export

  ai/
    localSummary.ts    # Local 2-sentence AI case summary (no API)

  utils/
    logic.ts           # Helpers: isJointFiling, hasVehicles, counts, etc.
    mask.ts            # Input masking (SSN, phone)
```

---

## Development

```bash
npm install
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

- **Client flow:** Open the app, complete steps, use “Attorney View” in the header to switch to the dashboard.
- **Attorney View:** Toggle back to “Client View” to return to the wizard. “Copy” copies the full intake payload (answers + uploads) as JSON.

---

## Deployment (GitHub Pages)

Deploys via **GitHub Actions** on push to `main`.

1. **Settings** → **Pages** → **Source**: **GitHub Actions**.
2. Push to `main`; the “Deploy to GitHub Pages” workflow builds and publishes the site.

See [docs/GITHUB_PAGES_SETUP.md](docs/GITHUB_PAGES_SETUP.md) for details and the manual-deploy option.

---

## Environment

- **Development:** No env vars required.
- **Deploy script / push from CI:** Copy `.env.example` to `.env` and set `GITHUB_TOKEN` if you use the repo’s push script. `.env` is gitignored.

---

## Roadmap

- [x] Guided multi-step intake with conditional logic
- [x] Document upload prompts by section
- [x] Client autosave and progress
- [x] Attorney View with case status and action queue
- [x] Document sufficiency and schedules coverage
- [x] Filing checklist and client doc request generator
- [ ] Magic link / client access
- [ ] Secure document storage
- [ ] Production auth and data handling

---

## License

See [LICENSE](LICENSE).
