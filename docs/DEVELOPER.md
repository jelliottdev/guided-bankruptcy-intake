# Developer Guide

This guide explains how to extend the bankruptcy intake: adding steps, fields, validation, and how the architecture is organized.

---

## Architecture overview

- **Client flow:** `App.tsx` renders either the multi-step wizard or the Attorney Dashboard. The wizard uses `getVisibleSteps(answers)` so steps can be shown/hidden by conditional logic (e.g. joint filing, “do you own real estate?”).
- **State:** `IntakeProvider` holds `answers`, `uploads`, `flags`, `currentStepIndex`, and persists to localStorage via `autosave.ts`. No backend.
- **Form definition:** All steps live in `src/form/steps/allSteps.ts`. Each step has `id`, `title`, `fields[]`, and `showIf(answers)`. Fields support types: `text`, `textarea`, `email`, `date`, `radio`, `checkbox`, `select`, `grid`, `file`, `repeatable_count`.
- **Validation:** `src/form/validate.ts` runs over visible steps and required/conditional fields, returns `ValidationError[]` with step index, field id, message, and optional `severity: 'warning'`. Errors block “Next” and submit; warnings do not.
- **Attorney logic:** `src/attorney/` contains readiness, means test, exemptions, risk assessment, action priority, report generation. The dashboard in `src/ui/dashboard/` composes these and reads from the same intake state.

---

## Adding a new step

1. In `src/form/steps/allSteps.ts`, define a step object:
   - `id`: unique string (e.g. `'my_step'`)
   - `title`, optional `description`, `showIf: (answers) => boolean`
   - `fields`: array of field definitions (see below)
2. Add the step to the `ALL_STEPS` array in the order it should appear.
3. If the step has required fields, validation will run automatically; add any custom rules in `validate.ts` if needed.

---

## Adding fields

Each field in a step has at least:

- `id`: unique within the step (global uniqueness recommended for easier validation/jump-to)
- `type`: one of `text`, `textarea`, `email`, `date`, `radio`, `checkbox`, `select`, `grid`, `file`, `repeatable_count`
- `label`: string shown to the user
- `required`: optional boolean; when true, empty value produces a validation error
- `showIf`: optional `(answers) => boolean` to hide the field when false

Other optional props: `placeholder`, `helper`, `options` (for radio/select), `rows`/`columns` (for grid), `whyWeAsk`, `uploadForTag` (for file), etc. See `src/form/types.ts` for the full `Field` interface.

### Repeatable sections (e.g. multiple properties)

Use `type: 'repeatable_count'` with `repeatableCount`:

- `itemLabel`: e.g. `'property'`
- `itemPrefix`: e.g. `'property'` (keys become `property_1_address`, `property_2_address`, …)
- `fieldSuffixes`: list of suffix names so “Add” can initialize new item keys
- `min`, `max`: e.g. 1 and 20

Then define fields for `property_1_*`, `property_2_*`, … up to `property_20_*` (or your max), each with `showIf` that checks e.g. `getRealEstateCount(answers) >= n`. See real estate, bank accounts, and vehicles in `allSteps.ts`.

---

## Validation

- **Required fields:** Handled automatically; message text is derived from the field label in `requiredMessage()` in `validate.ts`.
- **Format checks:** SSN last 4, email, date, phone length are in `validateAll()`. Add new format rules there and push to `errors` with the same `ValidationError` shape.
- **Cross-field:** Example: “mailing address required if different from physical” and “expenses vs income” warning. Add logic in `validateAll()` and push with `severity: 'warning'` for non-blocking hints.
- **Per-step errors:** Use `getErrorsForStep(answers, stepIndex)` or filter `validateAll(answers)` by `stepId` / `stepIndex`.

---

## Conditional visibility

- **Step visibility:** Set `showIf` on the step. Steps with `showIf(answers) === false` are omitted from `getVisibleSteps(answers)` and from the progress bar.
- **Field visibility:** Set `showIf` on the field. Hidden fields are not rendered and not validated.

Helpers in `src/utils/logic.ts` (e.g. `isJointFiling`, `hasRealEstate`, `getRealEstateCount`) are used in many `showIf` conditions. Use them for consistency.

---

## Attorney dashboard

- New dashboard sections go under `src/ui/dashboard/` (e.g. a new card component). Compose them in `DashboardLayout.tsx`.
- Data comes from `answers`, `uploads`, and attorney overlay state (financial numbers, creditor matrix, action status) loaded in `AttorneyDashboard.tsx` and passed down.
- New attorney logic (e.g. a new calculator) goes in `src/attorney/` and can be called from dashboard components or from `snapshot.ts` if it feeds the summary or action queue.

---

## Tests

- **Vitest** is used for unit tests. Run with `npm run test`.
- Tests live next to source (e.g. `src/form/validate.test.ts`, `src/attorney/meansTest.test.ts`) or under `src/__tests__/`.
- Cover validation rules, logic helpers, means test, exemptions, and readiness when changing those areas.

---

## Data and localStorage

- Intake: `gbi:intake:v1` (answers, uploads, flags, step index, etc.).
- Attorney overlay: `gbi:attorney-financial`, `gbi:attorney-creditor-matrix`, `gbi:action-status`, `gbi:means-test-state`, `gbi:exemption-set`.
- Schema changes (e.g. new required keys) should be backward-compatible or migrated; document in this file or in a MIGRATION.md if needed.
