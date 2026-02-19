# Scripts

## PDF form audit (B101 validation)

**audit_pdf_fields.py** — Reports filled vs empty fields, coverage %, and B101-critical checks.

```bash
# Install dependency once
pip install pypdf

# Human-readable report
python3 scripts/audit_pdf_fields.py path/to/Official-Form-101-Nicholas-Wallace-2026-02-17.pdf

# JSON output
python3 scripts/audit_pdf_fields.py path/to/form101.pdf --json
```

Use this after generating Form 101 to confirm chapter, fee, venue, prior bankruptcy, credit counseling, debt type, creditor/asset/liability estimates, signatures, and attorney section are filled.

## List B101 template field names

**list_b101_form_fields.mjs** — Prints every AcroForm field name and type from the blank B101 template. Use to align `src/engine/mapping/b101.ts` with your template.

```bash
# From repo root (uses public/forms/b101.pdf by default)
node scripts/list_b101_form_fields.mjs

# Or pass a path
node scripts/list_b101_form_fields.mjs /path/to/b101.pdf
```

Requires `pdf-lib` (already a project dependency).
