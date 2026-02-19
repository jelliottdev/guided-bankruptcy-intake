# Form templates and Wallace source mapping

Template paths are relative to `public/`. Wallace pleadings live in `Documents - Wallace/Pleadings - Wallace/`.

## Canonical form id → template filename

| Form ID     | Template filename                    | Label / official form           |
|-------------|--------------------------------------|---------------------------------|
| b101        | forms/b101.pdf                       | Form 101 (Voluntary Petition)    |
| schedule-ab | forms/form_b106ab.pdf                | Schedule A/B (Property)         |
| b106d       | forms/form_b106d.pdf                 | Schedule D (Creditors)          |
| b106c       | forms/b_106c_0425-form.pdf           | Schedule C (Exemptions)         |
| b122a1      | forms/b_122a-1.pdf                   | Form 122A-1 (Means test)        |
| b122a2      | forms/b_122a-2_0425-form.pdf         | Form 122A-2                     |
| b122a1supp  | forms/form_b122a-1supp.pdf           | Form 122A-1 Supplement           |
| b122c1      | forms/form_b122c-1.pdf               | Form 122C-1                     |
| b122c2      | forms/b_122c-2_0425-form.pdf         | Form 122C-2                     |
| form2000    | forms/form-2000_0425-form.pdf         | Form 2000 (Cover sheet / other)  |

**Authoritative B101:** We use `b101.pdf` for generation. `form_b_101_0624_fillable_clean.pdf` is an alternate; keep mapping aligned with whichever template is in the registry.

## Wallace pleading → form (extraction source)

| Wallace file | Form(s) | Page range / notes |
|--------------|---------|--------------------|
| (Doc 1) Voluntary Petition - Wallace (1).pdf | B101 | All pages (single-form petition) |
| (Doc 2) Application to Pay Filing Fee in Installments - Wallace.pdf | Fee installment application | All pages |
| (Doc 4) CCC - Wallace.pdf | Credit counseling certificate | All pages |
| (Doc 15) Chapter 13 Plan (1).pdf | Chapter 13 plan | All pages |
| (Doc 6) Order Approving Application... | Court order (not a form we fill) | — |
| (Doc 7) Notice of Deficient Filing.pdf | Notice (not a form we fill) | — |
| (Doc 8) Notice of CH 13 Case (9).pdf | Notice (not a form we fill) | — |
| (Doc 9, 13, 14, 18) Request for Notice - *.pdf | Creditor notices | — |
| (POC 1–4) *.pdf | Proof of claim | — |

If a Wallace PDF contains **multiple forms** in one file, record the page range per form in the table above and use that when extracting (e.g. extract by page range or by field-name prefix). Doc 1 (Voluntary Petition) is treated as B101 only for now.

## Usage

- **Registry** ([src/engine/forms/registry.ts](../src/engine/forms/registry.ts)): `templatePath` must match a filename in this table (e.g. `forms/form_b106ab.pdf` for schedule-ab).
- **Inspection**: Run `node scripts/inspect-pdf-form.mjs public/forms/<filename>` to list AcroForm field names and types. For JSON dumps: `node scripts/inspect-pdf-form-json.mjs public/forms/<filename>.pdf docs/form-fields/<filename>.json`.
- **Wallace extraction**: Run inspection (or text/OCR extraction) on the Wallace file listed above for each form to get field → value for seed and gold. B101 reference (Doc 1 is flattened; values from seed): [docs/wallace-b101-values.json](wallace-b101-values.json).

## Schedule A/B validation (gold/assert pattern)

Schedule A/B uses the same rigorous pattern as B101: gold data → fill template → assert filled PDF.

- **Gold**: Built from seed via `mapRealEstateToScheduleA(getSeededAnswers())` and `mapAssetsToScheduleB(getSeededAnswers())`.
- **Validator**: [src/export/scheduleAB-validate.ts](../src/export/scheduleAB-validate.ts) — `readScheduleABFormValues(pdfBytes)` and `assertScheduleABGold(pdfBytes, goldA, goldB)` return `{ passed, failed }`.
- **Test**: `npm run test -- src/export/scheduleAB.validation.test.ts` — fails if any assertion fails; **perfect** when `result.failed.length === 0`.
- **Iteration script**: `node scripts/test-schedule-ab.mjs` — runs the validation and prints PASS or FAIL; on failure the test output lists every failed assertion (label, field, expected, actual). Use `WRITE_SCHEDULE_AB=1 node scripts/test-schedule-ab.mjs` to write `tmp/schedule-ab-output.pdf` for visual check.

**When it's crap**: The Schedule A/B validation test fails or the script exits with failures. **When it's perfect**: The test passes (all gold assertions pass).
