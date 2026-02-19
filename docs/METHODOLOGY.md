# VeriDocket: Canonical Schema Derivation Methodology

## The Core Principle

**Don't invent a schema. Extract it from the forms.**

The courts define what data is required via official forms. Your canonical schema
is the *union of all fields across all forms*, normalized into debtor-centric
entities. Forms are then just *projections* (views) over the canonical schema.

## The 4-Step Process (repeat per form)

### Step 1: Extract PDF Fields

```python
from pypdf import PdfReader
reader = PdfReader("form.pdf")
for page_num, page in enumerate(reader.pages):
    if "/Annots" in page:
        for annot in page["/Annots"]:
            obj = annot.get_object()
            print(obj.get("/T"), obj.get("/FT"))
```

This gives you every fillable field name and type. B101 has 246 fields:
- `/Tx` = text inputs (names, addresses, dates)
- `/Btn` = checkboxes/radios (yes/no, chapter selection, ranges)
- `/Ch` = dropdowns (district selection)

### Step 2: Map Fields → Canonical Paths

For each PDF field, assign a canonical dot-path:

| PDF Field Name | Canonical Path | Type |
|---|---|---|
| `First name` | `debtor1.name.first` | text |
| `SSNum` | `debtor1.ssnLast4` | text |
| `Bankruptcy District Information` | `filing.district` | dropdown |
| unnamed checkbox (page 3, pos 0) | `filing.chapter` = "7" | checkbox |

**Key decisions:**
- Named fields (`/T` present) → direct mapping
- Unnamed fields (common for checkboxes) → map by page + ordinal position
- Duplicate names (e.g. "First name" appears for D1 and D2) → resolve by page column
- Multi-line fields (e.g. venue explanation spans 4 lines) → single canonical string, split at fill time

### Step 3: Build Canonical Entity from Paths

Group paths by entity:

```
debtor1.name.first    → Debtor.name: Name
debtor1.name.last     → 
debtor1.ssnLast4      → Debtor.ssnLast4: string
debtor1.address.*     → Debtor.address: Address
filing.chapter        → CaseFiling.chapter: enum
filing.district       → CaseFiling.district: string
```

When you add Schedule I, you'll find income fields that extend the schema:
```
debtor1.income.employer     → new entity
debtor1.income.grossMonthly → new field
```

**The schema grows with each form but never breaks** — every new form just adds
optional fields or new entities.

### Step 4: Write Validators

For each form, define which canonical paths are **required** vs **optional**:

```typescript
if (!caseData.debtor1?.name?.first) {
  issues.push({
    code: "B101.D1_FIRST_NAME",
    severity: "blocking",
    message: "Debtor 1 first name is required",
    fix: { kind: "openField", fieldPath: "debtor1.name.first" }
  });
}
```

This is what powers your "Form 101 Readiness" panel with Fix buttons.

## Handling Unnamed Checkboxes

B101 has ~100 unnamed `/Btn` fields. The PDF stores them as annotation objects
with rectangle coordinates but no `/T` (name) tag.

**Production approach:**
1. Extract the `/Rect` (bounding box) for each unnamed annotation
2. Sort by page, then by Y coordinate (top→bottom), then X (left→right)
3. Match to the form's visual layout (you already have the PDF content)
4. Assign canonical paths based on what each checkbox means

**Quick approach (for now):**
- Map by page + ordinal position (as done in b101-field-mapping.ts)
- Verify by filling a test PDF and checking which boxes get checked

## The Unnamed Field Problem & Solution

Many government PDFs have duplicate or missing field names. This is normal.
Your options:

1. **Rename fields** in a copy of the PDF using a tool like `pdftk` or `qpdf`
2. **Use annotation index** — access fields by their position in the page's
   `/Annots` array rather than by name
3. **Use coordinates** — the `/Rect` array gives you `[x1, y1, x2, y2]`
   which you can match to known form positions

For VeriDocket production, option 3 (coordinate-based) is most robust because
it survives form version updates where field ordering might change.

## Form Pack Architecture

```
/form-packs
  /B101_0624
    template.pdf          ← the official fillable PDF
    mapping.ts            ← FieldMapping[] + CheckboxMapping[]
    validators.ts         ← validateB101Readiness()
    README.md             ← form-specific notes
  /B122A1_0424
    template.pdf
    mapping.ts
    validators.ts
  /ScheduleI_0424
    ...
```

Each pack is self-contained. Adding a new form = adding a new directory.
The canonical schema grows to accommodate new fields as packs are added.

## Multi-Form Field Sharing

Many fields appear on multiple forms. The canonical schema handles this naturally:

| Canonical Path | Used By |
|---|---|
| `debtor1.name.first` | B101, B106A/B, B106D, B106E/F, B122A |
| `debtor1.address.*` | B101, B106A/B |
| `filing.chapter` | B101, B122A |
| `debtor1.income.grossMonthly` | Schedule I, B122A-1 |
| `debtor1.income.employer` | Schedule I |

**One write, many reads.** Attorney fills the data once. Engine projects it
onto every form that needs it.

## What to Build Next

1. **Form 122A-1** (Means Test) — highest legal complexity, validates chapter eligibility
2. **Schedule I** (Income) — feeds means test calculations
3. **Schedule J** (Expenses) — feeds disposable income
4. **Schedule A/B** (Assets) — repeating creditor tables
5. **Schedule D** (Secured Debts) — creditor table with collateral

Each one follows the exact same 4-step process above.
