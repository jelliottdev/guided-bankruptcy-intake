# Form field dumps

Each JSON file is the output of `scripts/inspect-pdf-form-json.mjs` for the corresponding template in `public/forms/`. Use these to align mapping modules (e.g. `src/engine/mapping/b101.ts`, `scheduleAB.ts`) with the **exact** AcroForm field names in each template.

- **fields**: array of `{ name, type, value?, checked?, V?, AS?, options?, selected? }`. Checkbox export values appear in `V` / `AS`; dropdown options in `options`.
- **source**: template filename.
- **totalFields**: count.

Regenerate after replacing a template:  
`node scripts/inspect-pdf-form-json.mjs public/forms/<filename>.pdf docs/form-fields/<filename>.json`

## Schedule A/B validation

Schedule A/B (form_b106ab.pdf) is validated by the same gold/assert pattern as B101. Run `npm run test -- src/export/scheduleAB.validation.test.ts` or `node scripts/test-schedule-ab.mjs` to iterate until all assertions pass. See [FORM_TEMPLATES.md](../FORM_TEMPLATES.md#schedule-ab-validation-goldassert-pattern).
