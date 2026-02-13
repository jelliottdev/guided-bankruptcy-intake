# Guided Bankruptcy Intake

A guided intake for bankruptcy: a step-by-step client questionnaire plus an **Attorney View** dashboard for case triage, readiness, document tracking, and next actions.

**Live demo:** [jelliottdev.github.io/guided-bankruptcy-intake](https://jelliottdev.github.io/guided-bankruptcy-intake/)

---

## What this is

- **Client flow** — Multi-step wizard: filing setup, debtor/spouse info, urgency, assets, debts, income, expenses, document uploads, final review. Conditional branching, autosave to localStorage, and optional “can’t answer” flags with notes.
- **Attorney View** — Dashboard with:
  - **Case status** (computed: Urgent / Not ready / Ready to file) and **Next best action** (algorithmic: open action queue, copy doc request, jump to flags, or review)
  - **Action queue** (Blocks filing / Important / Follow-up) with status selector and jump-to-field (deep link into client wizard)
  - **Document sufficiency** (expandable rows, copy request per type)
  - **Schedules coverage**, **Financial signals** (manual attorney entry, income/expense bars, surplus, ratio)
  - **Creditor matrix** (intake-derived + attorney-added rows, copy worksheet)
  - **Filing readiness** (blockers, missing schedules, timeline, copy checklist)
  - **AI summary** (2-sentence case summary, regenerate with 10s cooldown, copy to notes)
  - **Client reliability** score with formula explanation
  - **Export Case Snapshot** (JSON: answers, uploads, flags)
  - Developer/debug section (collapsed by default)

Built for workflow validation and attorney feedback. See [Production and data](#production-and-data) for deployment considerations.

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite** (build and dev server)
- No backend: state and uploads live in memory and **localStorage** (prototype/demo). Attorney overlays (financial entry, creditor matrix) also persist in localStorage under keys `gbi:*`.

---

## Project structure

```
src/
  App.tsx                 # Root: client wizard vs attorney dashboard, step navigation, jump-to-field
  main.tsx                # Entry, error boundary
  index.css               # Global + attorney dashboard styles

  form/                   # Intake definition and validation
    steps/                # Step definitions and visibility helpers
      index.ts            # Public exports for step definitions
      allSteps.ts         # Step and field definitions (showIf, helpers)
    types.ts              # Answers, flags, field value types
    validate.ts           # Required-field and step-level validation
    defaults.ts           # Default answers

  state/
    IntakeProvider.tsx    # Context: answers, uploads, flags, step, autosave, setAnswer, setFlag
    autosave.ts           # Debounced persist to localStorage

  ui/
    Layout.tsx            # Shell, nav, save status
    StepShell.tsx         # Per-step container, next/back
    FieldRenderer.tsx    # Renders fields by type (text, file, radio, etc.), field IDs for deep link
    Progress.tsx          # Step progress
    Review.tsx            # Final review step
    AttorneyDashboard.tsx # Attorney View: all dashboard panels and actions

  attorney/               # Attorney logic (no UI)
    readiness.ts          # Case readiness %, bands, primary blockers, getCaseStatus, getNextBestAction
    snapshot.ts           # Doc sufficiency, schedule coverage, follow-up questions, timeline, checklists
    clientReliability.ts   # Reliability score and breakdown
    creditorMatrix.ts      # Creditor list from intake, worksheet export (intake + attorney overlay)

  ai/
    localSummary.ts       # Rules-based 2-sentence case summary (variation seed for regenerate)

  utils/
    logic.ts              # Helpers: isJointFiling, hasVehicles, counts, getCaseStatus, getNextBestAction
    mask.ts                # Input masking (SSN, phone)
```

---

## Development

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

- **Client flow:** Open the app, complete steps. Data autosaves to localStorage.
- **Attorney View:** Use the header toggle to switch to the dashboard. “Copy” copies answers + uploads JSON; “Export Case Snapshot” adds flags and meta. “Jump to field” from the action queue switches to Client View and scrolls to that field.

---

## Deployment (GitHub Pages)

Deploys via **GitHub Actions** on push to `main`.

1. **Settings** → **Pages** → **Source**: **GitHub Actions**.
2. Push to `main`; the workflow runs lint, test, build, and publishes `dist/`.

---

## Environment

- **Development:** No env vars required.
- **CI / deploy:** No env vars required for the GitHub Actions deploy workflow.

---

## Production and data

- **Data:** All intake data (answers, uploads, flags) and attorney overlays (financial numbers, creditor list) are stored in the browser only (localStorage). There is no server, no database, and no persistence across devices.
- **Sensitive data:** Do not use this app as-is for real client PII in production. For production use you would add: authenticated access, server-side storage, encryption, and compliance (e.g. confidentiality, retention).
- **Current scope:** Suitable for demos, internal workflow testing, and as a front-end reference for a future backend.

---

## Roadmap

- [x] Guided multi-step intake with conditional logic
- [x] Document upload prompts and client-facing help text
- [x] Client autosave and progress
- [x] Attorney View: case status, next best action, action queue (status selector, jump-to-field)
- [x] Document sufficiency and schedules coverage
- [x] Filing checklist and client doc request generator
- [x] Financial signals (manual entry, bars, ratio)
- [x] Creditor matrix (intake + attorney-added, copy worksheet)
- [x] AI summary with regenerate and variation
- [x] Export Case Snapshot JSON
- [ ] Magic link / per-client access
- [ ] Secure document storage and backend
- [ ] Production auth and data handling

---

## License

See [LICENSE](LICENSE).
