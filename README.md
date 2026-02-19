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
  App.tsx, main.tsx       # Root: client vs attorney view, step navigation, jump-to-field
  index.css               # Global + attorney dashboard styles

  form/                   # Intake definition and validation
    steps/                # Step definitions, visibility (allSteps, index)
    types.ts, validate.ts, defaults.ts, seedData.ts

  state/                  # Intake state and persistence
    IntakeProvider.tsx    # Context: answers, uploads, flags, step, autosave
    autosave.ts, clientScope.ts

  engine/                 # Canonical case model and PDF generation
    transform.ts          # intakeToCanonical (intake → canonical)
    types.ts              # CaseCanonical, Debtor, etc.
    export/               # B101 and Schedule A/B PDF fill (b101.ts, scheduleAB.ts)
    mapping/              # Canonical path → PDF field (b101.ts, scheduleAB.ts)

  ocr/                    # Document OCR extraction and reconciliation
    store.ts, queue.ts, reconcile.ts, types.ts, fieldMapping.ts

  attorney/               # Attorney logic (readiness, snapshot, means test, creditor matrix)
    readiness.ts, snapshot.ts, meansTest.ts, creditorMatrix.ts, attorneyProfile.ts
    vm/                   # View models for dashboard (readinessVM, etc.)
    store/, types/

  ui/                     # React UI
    Layout.tsx, StepShell.tsx, FieldRenderer.tsx, Progress.tsx, Review.tsx
    AttorneyDashboard.tsx, AccessGate.tsx, PageSurface.tsx
    workspace/            # Attorney workspace, filing drawer, tabs
    client/               # Client-facing panels (messages, todo, dashboard tabs)
    dashboard/            # Dashboard panels (CaseHeader, ActionQueue, Financial, etc.)
    shared/, fields/      # Shared components and field UIs

  questionnaires/         # Questionnaire templates, assignments, runtime
    store, runtime/, types, seeds/

  workflow/, issues/      # Workflow state and issue tracking
  files/                  # Blob storage (blobStore)
  telemetry/              # Local telemetry, baseline metrics
  theme/                  # MUI Joy theme (attorneyTheme)
  api/, config/           # API client (OCR), app config
  ai/                     # Rules-based case summary (localSummary)
  utils/                  # logic.ts, mask.ts
  auth/, documents/, scheduling/, examples/, seed/   # Supporting modules
```

**Form PDFs:** All form templates (B101, Schedule A/B, etc.) live in `public/forms/` and are served at runtime. See [docs/](docs/) for methodology and field mapping reference.

**Scripts:** One-off dev tools (e.g. PDF field inspection) are in `scripts/`. Run from repo root; paths in scripts assume `./public/forms/` for PDFs when no argument is given.

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

- **File naming:** React components and UI modules use **PascalCase** (e.g. `AttorneyDashboard.tsx`, `IntakeProvider.tsx`). All other modules use **camelCase** (e.g. `readiness.ts`, `attorneyProfile.ts`).
- **Client flow:** Open the app, complete steps. Data autosaves to localStorage.
- **Attorney View:** Use the header toggle to switch to the dashboard. “Copy” copies answers + uploads JSON; “Export Case Snapshot” adds flags and meta. “Jump to field” from the action queue switches to Client View and scrolls to that field.

### Backend (optional)

An optional **Python OCR service** lives under `backend/ocr-service` (FastAPI + PaddleOCR). It provides document extraction (paystubs, bank statements, tax returns). The app runs fully without it; OCR features degrade gracefully if the service is not available. For setup, see [docs/QUICKSTART_OCR.md](docs/QUICKSTART_OCR.md) or [docs/PADDLEOCR_INTEGRATION.md](docs/PADDLEOCR_INTEGRATION.md).

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
