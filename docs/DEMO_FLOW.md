# Demo flow (Wallace)

This document describes how the guided bankruptcy intake demo works: schema, seed, Reset, Load Demo, and blockers.

## 1. Canonical schema

The intake field set is defined by **ALL_STEPS** in `src/form/steps/allSteps.ts`. Every step and field there is the single source of truth. `src/form/caseSchema.ts` exports **CANONICAL_INTAKE_FIELD_IDS** (the set of all field ids) so seed, questionnaire graph, and exporters stay aligned.

## 2. Seed = full demo case

**Seed** in `src/form/seedData.ts` is the canonical demo case: **getSeededAnswers()** and **getSeededUploads()** return a fully filled intake (Nicholas Wallace) that passes validation and document sufficiency. The seed is built from `getInitialAnswers()` (all keys from ALL_STEPS) plus overrides. Tests in `src/form/seedData.test.ts` assert that the seed has every canonical field id, passes **validateAll** with no required errors, and has no Missing/Partial docs in **getDocumentSufficiency**.

## 3. Reset = empty state

**Reset** clears all demo state to a known empty state:

- Intake: **reset()** restores initial intake (empty answers, uploads, flags).
- Questionnaire: state is set to **getFreshQuestionnaireState()** (seed templates + assignments, no responses) and persisted.
- **clearDemoState()** removes all demo-related localStorage keys (Wallace flag, attorney financial, scheduling, questionnaires).
- OCR state, blobs, and issues are cleared.

After Reset, the app is in a consistent empty/demo-ready state; **Load Wallace demo** is the only way to get the fully filled case.

## 4. Load Demo = fill from seed and set flag

**Load Wallace demo**:

1. Clears OCR (and optionally blobs).
2. Builds questionnaire **responses** from the intake graph nodes and seed (each node with `legacyFieldId` gets the value from getSeededAnswers() or getSeededUploads()).
3. Updates questionnaire state (responses + assignment stage).
4. Dispatches a **single HYDRATE** with answers = getSeededAnswers(), uploads = getSeededUploads(), flags = {}.
5. Sets the **Wallace flag** in localStorage (`gbi:wallace-demo-loaded` and scoped key).
6. Starts blob fetch/OCR for Wallace PDFs in the background (fire-and-forget).

The **questionnaire → intake sync** effect does **not** run when the Wallace flag is set, so intake is never overwritten by questionnaire state after Load Demo.

**Wallace PDFs:** The dev server serves demo PDFs from the `Documents - Wallace` folder (or `WALLACE_DOCS_DIR`). The seed references only files that exist in that folder (paystubs, bank statements, tax returns, vehicle docs, credit reports, counseling certs, and `Bringback-122135.pdf` as the mortgage-doc stand-in — there is no separate mortgage statement). `Bringback-122135.pdf` is hand-filled and has good info for seeding; good OCR is recommended to extract data from it.

## 5. Blockers and workflow

**Blockers** are computed from **validateAll** (required fields) and **getDocumentSufficiency** (required docs). The attorney workspace shows workflow items (Data groups, Documents, Messages) from these. For the **demo case** (case title "Nicholas Wallace" or Wallace flag set), the workspace uses **seed** for effectiveAnswers and effectiveUploads and does not add Data/Docs items to the workflow list, so the Workflow tab shows "No open items". Blockers exist and work for any non-demo case; for the loaded demo they correctly show zero.
