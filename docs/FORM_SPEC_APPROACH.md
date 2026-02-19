# Form-fill approach: spec-driven, no blind iteration

## Data flow (single canonical, all forms)

All forms are filled from one **CaseCanonical** model. Data flows like this:

1. **Sources**  
   - **Client:** Questionnaire answers (intake steps) → `intakeToCanonical(answers)` produces the base canonical.  
   - **Attorney:** Profile (name, firm, address, bar number, etc.) and optional signature date.  
   - **Case overrides (optional):** Attorney-set values (e.g. chapter, fee, debt type) that override questionnaire.

2. **Single merge point**  
   `buildCanonical(answers, attorney?, caseOverrides?)` in `src/engine/transform.ts` builds the canonical used everywhere: UI (FilingToolsDrawer), tests (gold fixture), and any script. No form-specific patches; the same canonical drives B101, Schedule A/B, and future forms.

3. **Form pipeline**  
   Form registry (`src/engine/forms/registry.ts`) maps form id → template path, filler, and optional validator. To generate a form: fetch template buffer, then `generateForm(formId, canonical, templateBuffer)`. Fillers read only from `CaseCanonical` (and optional debtor signature dates on the canonical).

4. **Validation**  
   For forms with a validator (e.g. B101), tests use a gold canonical (e.g. seed + fixed attorney), generate the PDF, then `assertFormGold(formId, pdfBytes, gold)` to check key fields.

So: **sources → buildCanonical → CaseCanonical → form registry → filler → PDF**, and optionally **PDF → assertGold**.

## Attorney vs client (data contract)

- **Client (questionnaire):** Identity, contact, address, assets, debts, income, expenses, prior bankruptcy, **and** filing choices (chapter, fee, debt nature, creditor/asset/liability ranges, filing date). These are collected in the "Filing choices" step and in other steps; they feed `intakeToCanonical()` and thus `buildCanonical()`.
- **Attorney (profile):** Name, firm, address, phone, email, bar number, state, signature date. Stored in attorney profile; in tests we use `WALLACE_DEMO_ATTORNEY`; in the UI, `loadAttorneyProfile()`. Merged into canonical only via `buildCanonical(answers, attorney)`.
- **Case/attorney overrides (optional):** If we add "attorney chose Chapter 13" or "attorney set fee to installments," those will be explicit override fields (e.g. on case or profile) passed as the third argument to `buildCanonical(answers, attorney, caseOverrides)`, so both UI and backend tests use the same logic.

Form fillers do not care whether a value came from client or attorney; they read from `CaseCanonical` only. Attorney-only fields on the PDF (e.g. attorney signature, bar number) are filled from `canonical.attorney`; debtor and petition fields from `canonical.filing`, `canonical.debtor1`, etc.

## Chapter (7 vs 13 and others)

**Rule:** Chapter = petition/intake value if present (`filing_chapter` or `chapter` from questionnaire); else means-test suggestion if we have one (future); else attorney override if we add it (future); else default 7.

Today we only have intake or default 7. The "Filing choices" step asks the client for `filing_chapter` (7 / 11 / 12 / 13). Transform normalizes it in `intakeToCanonical()`; `buildCanonical()` does not change chapter unless `caseOverrides.filing.chapter` is provided. When we add means-test result or attorney override, we will document and implement them in the same place (transform or buildCanonical).

## Form → intake keys (what feeds each form)

When adding a new form, list which canonical paths it uses; those paths are populated from intake (questionnaire) and/or attorney. For B101, the main intake keys that drive canonical and thus the PDF are:

- **Filing:** `filing_chapter`, `filing_fee_method`, `filing_date` (and address/county for district).
- **Reporting:** `debt_nature`, `creditor_count_range`, `asset_range`, `liability_range`.
- **Debtors:** identity, contact, address steps (e.g. `debtor_full_name`, `debtor_phone`, `debtor_email`, `debtor_address`, `county`), plus spouse steps for joint filings.
- **Attorney:** from profile only (not questionnaire).

These are collected in the "Filing choices" step and elsewhere; defaults for petition fields live in `src/form/defaults.ts` (`PETITION_DEFAULTS`) so transform never sees undefined for required values.

---

## Problem

Filling PDF forms by "discovering" structure at runtime (iterating kids, reading AP/N keys, guessing export values) does not scale and rarely matches the filed doc. Form 101 alone has multi-kid checkboxes that need exact kid index + raw key; Schedules and means test have far more fields.

## Approach: one-time spec, dumb filler

1. **Inspect once per form**  
   Run an inspection script against the **exact** PDF you ship (or the court’s). Dump:
   - Every field name and type (text, checkbox, dropdown).
   - For each checkbox: number of kids and, per kid, the export value (AP/N key) and optionally kid index.

2. **Emit a spec file**  
   Check in a small spec (e.g. `b101-multi-kid-spec.ts`) that maps:
   - Field name → `{ kidCount, options: [ { value, kidIndex, rawKey } ] }` for multi-kid checkboxes, or
   - Field name → direct value mapping for simple fields.

3. **Filler is spec-driven**  
   The export code does **no discovery**:
   - Look up field in spec.
   - Get `kidIndex` and `rawKey` for the canonical value.
   - Set parent `/V` and each kid’s `/AS` in a loop of length `kidCount` only.

So runtime cost is **O(kidCount)** per multi-kid field (e.g. 3 for CB7, 12 for CB22), not O(all kids × all fields).

## B101 today

- **Simple fields:** `B101_FIELD_MAP` + standard text/checkbox/dropdown handling.
- **Multi-kid fields:** `b101-multi-kid-spec.ts` + `setMultiKidBySpec()`. Only four fields use the spec; each does a fixed number of iterations (3, 2, 12, 12).

If the template changes (e.g. new B101 revision), re-run inspection and update the spec. No change to filler logic.

## Schedules and means test

Same pattern:

1. Add an inspection script for that form (reuse or adapt `scripts/inspect-b101-fields.mjs`).
2. Run it against the Schedule/122A PDF and capture field names and, for any multi-widget fields, kid counts and export values.
3. Add a spec file (e.g. `schedule-a-spec.ts`, `form122a-multi-kid-spec.ts`) with the exact mappings.
4. In the filler, for each canonical value: look up in spec, then set by index/key only. No iteration over "all possible kids" or "all possible values."

This keeps fill logic simple and predictable and makes it possible to support many forms without runtime guessing.

## Adding a new form (checklist)

1. **Inspect the PDF**  
   Run an inspection script (e.g. `scripts/inspect-b101-fields.mjs` or a form-specific one) against the exact template you ship. Capture field names and, for multi-widget fields, kid counts and export values.

2. **Add mapping and spec**  
   - Add a mapping module (e.g. `src/engine/mapping/<form>.ts`) that maps canonical paths to PDF field names.  
   - If the form has multi-kid checkboxes or option lists, add a spec file (e.g. `b101-multi-kid-spec.ts`) with exact value → kidIndex/rawKey.

3. **Implement the filler**  
   In `src/engine/export/`, add a `generate<Form>(data: CaseCanonical, templateBuffer: ArrayBuffer)` that uses only the mapping and spec (no runtime discovery). Follow the same pattern as B101 and Schedule A/B.

4. **Register the form**  
   In `src/engine/forms/registry.ts`, add a `FormRegistration`: `formId`, `templatePath`, `label`, `generate`, and optionally `assertGold`.

5. **Add validation (optional but recommended)**  
   If you want a backend validation loop: add a gold fixture (reuse or extend canonical from seed + attorney) and an `assert*` function that reads the filled PDF and checks key fields. Add a test that generates and calls the assert; use `WRITE_*=1` to write the PDF to `tmp/` for manual check.

6. **Questionnaire coverage**  
   If the form needs canonical fields that are not yet collected, add them to the questionnaire (new or existing step) and to `PETITION_DEFAULTS` in `src/form/defaults.ts` if they need safe defaults. Document the form → intake keys (in this doc or in the registry) so the next developer knows what feeds the form. See [FORM_TO_INTAKE_MATRIX.md](FORM_TO_INTAKE_MATRIX.md) for Schedule A/B and B101 required fields → intake/OCR source.

No special seed path: new forms use the same `CaseCanonical` that B101 uses (or a subset). Same answers (or seed) produce the same canonical for all forms.
