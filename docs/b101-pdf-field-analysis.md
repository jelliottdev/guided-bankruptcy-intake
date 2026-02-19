# B101 PDF Template — Field Name and Export Value Analysis

**Source:** `public/forms/b101.pdf`  
**Inspection:** Scripts `scripts/inspect-b101-fields.mjs` and ad-hoc node checks (pdf-lib).

## Summary

- **Total fields:** 159 (127 text, 27 checkboxes, 1 dropdown, 4 buttons)
- **Check Box7 (Q8 fee)** in this template has **only one export value: `/Pay entirely`**. There is **no `/Installments` state** on Check Box7 in this PDF. To match a filed doc that shows "Installments", the template would need a different widget (e.g. another checkbox) or a different PDF version that includes an Installments state.
- **Check Box20 / Check Box22 / Check Box23** in this template have export value **`/No`** (Check Box20, 20A) or **`/0-50000`** (Check Box22, 23). There is **no `$500,001–$1 million` or `500001-1000000`** state on these boxes in this PDF; the only non-Off state seen is `/0-50000` for 22 and 23.

---

## All 159 Fields (by type)

### PDFCheckBox (27)

| Field Name   | Export value (AP/N key) | Notes |
|-------------|--------------------------|--------|
| Check Box1  | /Chapter 7              | Ch7 header |
| Check Box2  | (none)                  | Ch11/12/13 header; may have multiple kids |
| Check Box5  | /Lived in this district | Venue D1 |
| Check Box6  | /Lived in this district | Venue D2 |
| **Check Box7**  | **/Pay entirely**  | **Q8 fee — only “Pay entirely” in this template; no Installments** |
| Check Box8  | /No                     | Q9 prior BK No / or fee waiver |
| Check Box9  | /No                     | Q10 no pending |
| Check Box10 | /No                     | Q11 renter |
| Check Box11 | /No                     | Q11 eviction |
| Check Box12 | /No                     | Q12 sole prop |
| Check Box13 | /Health Care Business   | |
| Check Box14 | /Not filing under Chapter 11 | |
| Check Box15 | /No                     | Q14 hazardous |
| Check Box16 | /1                      | Q15 counseling D1 |
| Check Box17 | /1                      | Q15 counseling D2 |
| Check Box16A | /Incapacity            | |
| Check Box17A | /Incapacity            | |
| Check Box18 | /No                     | Q16 consumer No |
| Check Box19 | /No                     | Q16 business No |
| **Check Box20**  | **/No**   | **Q17 funds? — not an asset range in this template** |
| **Check Box20A** | **/No**   | |
| Check Box21 | /1-49                   | Q18 creditor count |
| **Check Box22**  | **/0-50000** | **Q19 assets — only 0-50000 in this template** |
| **Check Box23**  | **/0-50000** | **Q20 liabilities — only 0-50000 in this template** |
| Check Box24 | /No                     | |
| Check Box25 | /no                     | |
| Check Box26 | /no                     | |

(PDF names use `#20` for space; decoded above as space.)

### PDFTextField (127) — selection

- **Attorney:** Attorney.Bar number, Attorney.Bar State, Attorney.City, Attorney.Date signed, Attorney.Email address, Attorney.Firm name, Attorney.phone, Attorney.Printed name, Attorney.Sig, Attorney.State, Attorney.Street address_2, Attorney.Street address_3, Attorney.Zip
- **Debtor1:** Debtor1.City, Debtor1.County, Debtor1.Date signed, Debtor1.First name, Debtor1.Last name, Debtor1.Middle name, Debtor1.Name, Debtor1.SSNum, Debtor1.Signature, Debtor1.signature, Debtor1.State, Debtor1.Street, Debtor1.Street1, Debtor1.Suffix Sr Jr II III, Debtor1.ZIP Code, Debtor1.Tax Payer IDNum, etc.
- **Debtor2:** Debtor2.City, Debtor2.Date signed, Debtor2.Executed on, Debtor2.First name, Debtor2.Last name, Debtor2.Signature, Debtor2.signature, Debtor2.SSNum, Debtor2.State, Debtor2.Street, Debtor2.Tax Payer IDNum, Debtor2.ZIP, etc.
- **Other:** Bankruptcy District Information (dropdown), Case number, District, District_2, When, When_2, etc.

### PDFDropdown (1)

- Bankruptcy District Information — value: `__________ District of __________`

### PDFButton (4)

- attach, Button.Print1, Button.Reset, Button.SaveAs

---

## Implications for code

1. **Check Box7 (Q8 fee)**  
   This template only supports **“Pay entirely”**. It does **not** have an “Installments” export value. To get “Installments” on the form you would need either:
   - a different B101 template that has an Installments checkbox or state, or
   - an additional widget (e.g. another checkbox) in this PDF with state “Installments”, and map to that in `b101.ts`.

2. **Check Box20 / Check Box22 / Check Box23 (Q19 assets, Q20 liabilities)**  
   In this PDF, Check Box20 and 20A are **/No**; Check Box22 and 23 are **/0-50000** only. There is no `$500,001–$1 million` or `500001-1000000` state. So:
   - Writing `500001-1000000` or `$500,001-$1 million` will not match any AP/N key and will not show as selected.
   - To support the $500,001–$1 million range you’d need a template that defines that state (or additional checkboxes) for assets/liabilities.

3. **Naming**  
   Our mapping already uses the correct field names (Check Box7, Check Box20, Check Box22, Check Box23, etc.). The mismatch is **export values**: the template’s defined states don’t include Installments nor the high asset/liability range.

---

## How to re-run inspection

```bash
node scripts/inspect-b101-fields.mjs
```

To re-check export values for a given checkbox (replace `Check Box7` as needed):

```bash
node -e "
const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const doc = await PDFDocument.load(fs.readFileSync('public/forms/b101.pdf'));
const form = doc.getForm();
const cb = form.getCheckBox('Check Box7');
const d = cb.acroField.dict;
const ctx = d.context;
const kids = d.get(PDFName.of('Kids'));
const w = ctx.lookup(kids.get(0)).dict;
const ap = ctx.lookup(w.get(PDFName.of('AP')));
const n = ctx.lookup(ap.get(PDFName.of('N')));
console.log([...n.entries()].map(([k]) => k.toString().replace(/#20/g, ' ')));
"
```
