# OCR ingestion and pleadings for development

## Applying OCR results with provenance

When applying OCR results (e.g. in the filing tools drawer or a dedicated ingestion service):

1. **Write into intake answers or canonical** using the same keys that questionnaires use, so `buildCanonical` and form fillers (Schedule A/B, B101) see the data without special-case logic.

2. **Record provenance** so conflicts can be shown and the attorney can accept or reject. Use the existing `Provenance` type in `src/engine/types.ts`:
   - `source: "ocr"`
   - `sourceDocumentId`: ID of the uploaded document
   - `confidence`: 0–1 from the extractor
   - Optional: `page`, `bbox`, `extractorVersion`, `acceptedBy`, `acceptedAt`, `timestamp`

Where canonical or intake stores extracted values, attach this provenance so the UI can display “From document X (confidence 0.9)” and allow “Accept” / “Reject” or overwrite.

## OCR field mapping for Schedule A/B

`src/ocr/fieldMapping.ts` maps OCR-extracted field names to intake field IDs. Document types that feed Schedule A/B include:

| Document type   | OCR field(s)     | Intake key(s)        | Feeds Schedule A/B        |
|-----------------|------------------|----------------------|---------------------------|
| bank_statement  | endingBalance     | account_balance      | Part 3 financial accounts |
| tax_return      | agi               | income_last_year     | Income / means            |
| tax_return      | expectedRefund, refundAmount | tax_refunds_details | Part 3 tax refunds        |

Petition (debtor/address/chapter) can be added as a doc type and mapped to debtor/address and filing chapter when that pipeline exists. All mappings use the same intake keys that `mapAssetsToScheduleB` and `mapRealEstateToScheduleA` consume; see [FORM_TO_INTAKE_MATRIX.md](FORM_TO_INTAKE_MATRIX.md).

## Pleadings for development

- **Wallace (and similar) pleadings** can be used to keep gold data and seed aligned with real filed data:
  - `wallace-b101-values.json` in docs (or project root) when used as B101 gold (or equivalent) should reflect values from filed pleadings where applicable.
  - Seed data in [src/form/seedData.ts](../src/form/seedData.ts) can be derived from or cross-checked against pleadings so dev and tests match real-world cases.

- **Deriving seed from pleadings:** Optionally maintain a short doc or script that describes how to derive intake seed (and B101 gold values) from a set of pleadings (e.g. “debtor name from petition p.1; Schedule A/B from filed 106A/B PDF”), so new cases can be added the same way and the pipeline stays consistent.
