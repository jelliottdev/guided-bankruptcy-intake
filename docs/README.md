# Documentation

- **ARCHITECTURE.md** — High-level data flow, frontend/backend overview.
- **METHODOLOGY.md** — Canonical schema derivation (extract from forms, map to paths).
- **PADDLEOCR_INTEGRATION.md** — Full OCR backend and frontend integration guide.
- **QUICKSTART_OCR.md** — Short steps to run and test the OCR service.
- **OCR_INTEGRATION_DEMO.md** — Demo walkthrough of OCR in the app.

## Reference TypeScript files

The `.ts` files in this directory are **reference/spec** only:

- **canonical-schema.ts** — Zod-based canonical schema and provenance types (reference). The runtime source of truth for the canonical model and types is **`src/engine/types.ts`**.
- **b101-field-mapping.ts** — Full B101 field list and mapping notes (reference). The mapping used at runtime is **`src/engine/mapping/b101.ts`**.

Do not import these doc files from application code; use `src/engine/` instead.
