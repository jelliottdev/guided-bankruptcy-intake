# Contributing

## Setup

1. Clone the repo and install: `npm install`
2. Run the dev server: `npm run dev` (see [README.md](README.md#development))

## Before committing

- **Lint:** Run `npm run lint`. CI runs ESLint on push; fix any errors or warnings.
- **Build:** Run `npm run build` to ensure the project compiles.

## Code structure

- **Client flow:** `src/form/` (steps, types, validation, defaults) and `src/ui/` (Layout, StepShell, FieldRenderer, Progress, Review).
- **Attorney View:** `src/ui/AttorneyDashboard.tsx` (all dashboard UI) and `src/attorney/` (readiness, snapshot, clientReliability, creditorMatrix). Attorney logic is pure functions; dashboard wires them to state and UI.
- **State:** `src/state/` (IntakeProvider, autosave). No backend; data lives in memory and localStorage.

## Data and production

This app is a prototype. It does not use a server or database. Do not add handling of real client PII or secrets without a proper backend and security review.

## Questions

Open an [issue](https://github.com/jelliottdev/guided-bankruptcy-intake/issues) for bugs or feature ideas.
