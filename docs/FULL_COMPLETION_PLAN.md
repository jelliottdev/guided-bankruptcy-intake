# Full completion plan: fix every problem and long-term design

This document outlines (1) how to fix every current problem (including the Schedule A/B fill rate) and (2) a long-term architecture so the app works for **any client**, reaches **full completion**, and stays resilient to **form changes**. In real cases, data comes from **questionnaires**, **attorney decisions**, and **document OCR**; for dev and testing we use **pleadings** and seed to drive the same schema.

---

## Completed (Phases 1–2 and Part 8 totals)

- **Phase 1:** `fillScheduleAB` now fills: second property (`2_2`, `2_3`, `2_4`), second vehicle (`3_2`, `3_3`), real property type/county/ownership (`1 1a`, `1_2`, `1_4`), and "None" checkboxes for household lines 6–14 when no data.
- **Phase 2:** Canonical now carries `assets.scheduleA` and `assets.scheduleB` (set in `intakeToCanonical`). The form registry’s Schedule A/B generator uses the same `fillScheduleAB` with real template field names (single code path).
- **Part 8 totals:** Template field names for Part 8 are `undefined_155` (Schedule A total) and `undefined_163` (Schedule B total) per `form_b106ab.json`. These are set in `fillScheduleAB`, form-requirements spec, mapping, and fields-we-set; gold test asserts them. Fill rate with current seed: **~19.6%** (72/368 filled); 110 fields we intend to set, 66 filled for seed data.

---

## Part 1: Fix every current problem

### 1.1 Low fill rate (13.6% → target: full completion for data we have)

**Root cause:** We only map a subset of template fields and only the first property/vehicle. Many sections are unmapped; totals are not computed or written.

**Concrete fixes:**

| Area | Current | Fix |
|------|---------|-----|
| **Part 1 Real property** | Only first property (`1 1`, `1_3`) | Map second property to `2_2`, `2_3`, `2_4` (or per-template names). Fill `1 1a` (type), `1_2` (county/ownership), `1_4` from intake when present. |
| **Part 2 Vehicles** | Only first vehicle (`3 1`, `3 2`, `3 4`) | Map second vehicle to fields `3_2`, `3_3` (and any second-row fields from inspection). Seed already has `vehicle_2_*`; parser already returns multiple vehicles. |
| **Part 3 Personal (Q6–15)** | We set 6–14 description/amount; 12–15 and checkboxes partial | Set `12`, `13`, `14`, `15` and `N check` (None) where applicable. Align category keys in `fillScheduleAB` with seed grid keys (furniture, electronics, etc.). |
| **Part 4 Financial** | Cash, banks, retirement, security, tax refunds, Q35; many “None” checkboxes | Keep; add any missing “None” checkboxes for 31–34 if template has them. Fix typo `amout1` → correct template name if different. |
| **Part 5 Business / Part 6 Farm (Q36–52)** | Not mapped | Add intake questions for business/farm (yes/no, name, type, value). Add mapping in `fillScheduleAB` for template fields in those sections (from `form_b106ab.json`). If “None,” set the corresponding “None” checkbox. |
| **Totals** | Not filled | Compute Schedule A total (real property) and Schedule B total (all personal + financial). Find exact total field names from `docs/form-fields/form_b106ab.json` (e.g. total real estate, total personal property) and set them in `fillScheduleAB`. |
| **Ownership / “Who has interest”** | Not set | Map ownership (Debtor/Joint/Other) to the correct “Who has interest in property” checkbox set for real property and vehicles using template field names. |

**Implementation order:**

1. **Second property and second vehicle** in `fillScheduleAB.ts` using existing `scheduleA.properties[1]` and `scheduleB.vehicles[1]` (data already in seed and parsers).
2. **Totals:** In `scheduleA.ts` / `scheduleB.ts` we already have `totalValue`. In `fillScheduleAB` add `setText('<total_field_name>', formatCurrency(scheduleA.totalValue))` and same for Schedule B total once field names are identified from the template JSON.
3. **Real property extras:** `1 1a` (type), `1_2`, `1_4` from `RealProperty` / answers (e.g. `property_1_type`, `property_1_county`, ownership).
4. **Business/farm:** Add minimal intake (e.g. “Do you own a business or farm?” with short description/value); add mapping for Part 5/6 fields or “None” checkboxes.
5. **Household checkboxes:** Set `6 check` … `14 check` (or “None”) per line when we have no value for that line, so the form is consistent.

After these, re-run `node scripts/report-schedule-ab-fill.mjs` and iterate until fill rate is maximized for the data we collect.

### 1.2 Two Schedule A/B code paths

**Problem:** The **UI** uses `generateScheduleABPDF(answers)` → `mapRealEstateToScheduleA` / `mapAssetsToScheduleB` → `fillScheduleAB` (real template field names). The **form registry** uses `generateScheduleAB(canonical, templateBuffer)` in `src/engine/export/scheduleAB.ts` with `SCHEDULE_AB_FIELD_MAP`, which uses **placeholder** PDF names (`RealProp_1_Address`, etc.) that do not exist in `form_b106ab.pdf`, so the registry path does not fill the real form.

**Fix:** Unify on one path.

- **Option A (recommended):** Keep “Answers → Schedule A/B data → fillScheduleAB” as the only filler. Have the registry’s Schedule A/B generator accept `CaseCanonical`, derive `Answers` from canonical (e.g. a function `canonicalToAnswers(canonical): Answers` that fills only the keys needed for Schedule A/B), then call the same `mapRealEstateToScheduleA` / `mapAssetsToScheduleB` / `fillScheduleAB`. That way one mapping (real template field names) is used everywhere.
- **Option B:** Move all Schedule A/B data into the canonical schema (e.g. `canonical.assets.scheduleA`, `canonical.assets.scheduleB`), build that from `intakeToCanonical` (and later OCR/attorney), and have `fillScheduleAB` take that structure instead of Answers. Then the registry can call a single “canonical → Schedule A/B data → fillScheduleAB” path.

Either way, the filler must use the **actual** template field names from `docs/form-fields/form_b106ab.json`, not placeholder names.

### 1.3 Seed and gold alignment

- Seed (`getSeededAnswers`) and Wallace pleadings should remain the source for “what a full case looks like.” Keep B101-critical keys and Schedule A/B-related keys (properties, vehicles, accounts, household, etc.) aligned with `docs/wallace-b101-values.json` and any Wallace Schedule A/B reference.
- Validation test and report script should use the same seed so that “full completion” for that seed is measurable (e.g. fill rate and `assertScheduleABGold`).

### 1.4 Validation and reporting

- Keep `scheduleAB.validation.test.ts` and `report-schedule-ab-fill.mjs`. Extend the report to list **required** vs optional sections (once we have a form-requirements spec) and to flag required fields that are still empty.
- Add a small script or test that asserts “all fields we intend to set are present in the template” by comparing the set of field names used in `fillScheduleAB` against `form_b106ab.json`, so template renames are caught early.

---

## Part 2: Long-term design (any client, full completion, form resilience)

### 2.1 Single source of truth: what each form needs

- **Form-requirements spec (per form):** A checked-in spec (e.g. `docs/form-requirements/schedule-ab.json` or `src/engine/forms/requirements/scheduleAB.ts`) that lists:
  - Every section (e.g. Part 1–8 for Schedule A/B).
  - For each field (or logical group): logical id, required vs optional, conditional (e.g. “if no business, check None”).
- **Required-field list:** Used by validation to block “ready to file” until required fields are filled and by the filler to know what must have a value (or explicit “None”).
- **Benefit:** We can add new forms by adding a new spec and mapping; we can change forms by re-inspecting the PDF and updating the spec and mapping only.

### 2.2 Data flow: questionnaires, attorney, OCR

- **Canonical (and/or schedule-specific) schema** is the single representation of “what we know about the case.” All form fillers read from this (possibly via a thin Schedule A/B view built from canonical).
- **Inputs that populate the schema:**
  - **Questionnaires (intake):** Primary. Every question maps to one or more canonical/schedule paths. Adding a form requirement means adding intake questions (or reusing existing ones) so that every required field has a source.
  - **Attorney decisions:** Override or set fields (e.g. chapter, fee, debt type, or “confirm no business”). Stored as case overrides and merged in `buildCanonical(answers, attorney, caseOverrides)`.
  - **Document OCR / pleadings:** Extractions (e.g. from petition, statements, tax docs) are merged into canonical or into intake answers with provenance (e.g. `source: "ocr"`). For dev, pleadings can be used to **build or refine seed** and to **validate** that our schema can represent a real filed case.
- **Pleadings for dev:** Use Wallace (or other) pleadings to:
  - Derive reference values (e.g. `docs/wallace-b101-values.json`).
  - Ensure seed + case schema can represent every field that appears on the filed forms.
  - Later: OCR pipeline that fills canonical/intake from uploaded pleadings, with attorney review for conflicts.

### 2.3 Full completion definition

- **Per form:** All **required** fields are filled (value or explicit “None” where the form allows). Optional/conditional fields are filled when the case has that data (e.g. second property, business).
- **Validation:** Before “Ready to file,” run form-level validation: for each form, check that every required logical field has a value in the canonical (or Schedule A/B view). Missing required fields → blocking issue with fix action (open intake or open attorney override).
- **Metrics:** Fill rate (filled vs total template fields) is a proxy; the real metric is “required fields complete” and “no required field empty without a legal reason (e.g. N/A).”

### 2.4 Form-change resilience

- **Inspection-driven field names:** Template field names come from **inspection** only (e.g. `scripts/inspect-pdf-form-json.mjs` → `docs/form-fields/form_b106ab.json`). No hardcoded field names in the filler; the filler reads from a mapping that is keyed by logical id.
- **Mapping layer:** Introduce a small mapping module per form, e.g. `scheduleAbFieldMap.ts`, that maps:
  - **Logical id** (e.g. `schedule_ab.real_property.1.address`, `schedule_ab.real_property.1.value`)  
  - → **Template field name** (e.g. `1 1`, `1_3`) for the **current** template version.
- When the form PDF is updated (new revision):
  1. Re-run inspection on the new PDF; update `docs/form-fields/form_b106ab.json` (or versioned file).
  2. Update the mapping (logical id → new field names) only. Filler logic stays the same (it still asks for “real property 1 address” and writes to whatever name the mapping returns).
- **Optional:** Store mapping in JSON keyed by form version so multiple template versions can be supported.

### 2.5 Schema completeness

- **Canonical schema** (`src/engine/types.ts`) already has expansion points (`assets`, income stub, etc.). Extend it so that:
  - Everything needed for Schedule A/B (real property list, vehicles, financial accounts, household, business/farm, totals) is representable either in `canonical.assets` or in a dedicated structure that `intakeToCanonical` (and OCR/attorney) can populate.
- **Intake:** Every required form field should have a corresponding intake question (or attorney override or OCR extraction). Maintain a matrix: Form → Required field (logical id) → Source (intake key, attorney override, or OCR field).

---

## Part 3: Implementation phases (suggested order)

| Phase | What | Outcome |
|------|------|--------|
| **1** | Fix fill rate with **existing** data: second property, second vehicle, totals, real-property type/county/ownership, household “None” checkboxes. | Higher fill rate; report and test still pass. |
| **2** | Unify Schedule A/B path: registry uses same filler as UI (canonical → answers or canonical → Schedule A/B data → fillScheduleAB with real template names). | Single code path; no placeholder field names. |
| **3** | Form-requirements spec for Schedule A/B: required vs optional sections/fields; document total field names. | Clear definition of “full completion” for Schedule A/B. |
| **4** | Add intake (and seed) for business/farm; add mapping for Part 5/6 or “None.” | Schedule A/B Part 5/6 filled when applicable. |
| **5** | Mapping layer: logical ids → template field names (data-driven from form-fields JSON or small TS/JSON map). Filler uses mapping only. | Form changes require only re-inspection and mapping update. |
| **6** | Canonical expansion: ensure `assets` (or schedule view) holds all Schedule A/B data; populate from intake and, later, OCR/attorney. | One schema drives all forms; OCR/pleadings can merge into same schema. |
| **7** | Validation: “required fields complete” per form; blocking issues with fix actions. | “Ready to file” means required fields filled. |
| **8** | OCR/pleadings ingestion: merge into canonical or intake with provenance; use pleadings for seed and gold in dev. | Real cases get full completion from questionnaires + attorney + OCR; dev uses pleadings to test full completion. |

---

## Part 4: Summary

- **Fix now:** Map every template field we already have data for (second property/vehicle, totals, type/county/ownership, “None” checkboxes); add business/farm intake and mapping; unify the Schedule A/B code path so the registry uses the same filler as the UI with real template field names.
- **Long-term:** One form-requirements spec per form; one canonical (or schedule) schema; data from questionnaires, attorney, and OCR; mapping from logical id to template field name so form changes only require re-inspection and mapping updates; validation for “required fields complete” so we achieve full completion for any client.

This plan should take the app from 13.6% fill (and one-off paths) to full completion and form-resilient, client-agnostic operation.
