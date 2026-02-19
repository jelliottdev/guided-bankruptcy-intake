# Contributing

## Development setup

- Install dependencies: `npm install`
- Dev server: `npm run dev` (http://localhost:5173)
- Tests: `npm run test` (once) or `npm run test:watch` (watch mode)
- Lint: `npm run lint`

## Expectations

- **Tests:** Keep the test suite green. Run `npm run test` before submitting changes.
- **Lint:** Code must pass `npm run lint`. Fix any reported issues.
- **File naming:** React components and UI-only modules use **PascalCase** (e.g. `AttorneyDashboard.tsx`, `IntakeProvider.tsx`). All other modules use **camelCase** (e.g. `readiness.ts`, `attorneyProfile.ts`).

## Codebase scope

- **Engine:** Canonical case model and form generation live under `src/engine/` (transform, types, export, mapping). New form fill logic should prefer the canonical pipeline.
- **Legacy export:** `src/export/` still contains Schedule A/B and related mapping used by the UI; the engine depends on `export/scheduleB` for some mapping. Migrating fully to the engine is a separate effort.

## Pull requests

- Branch from `main`; keep changes focused.
- Ensure tests and lint pass. The project may run CI (e.g. GitHub Actions) on push.
