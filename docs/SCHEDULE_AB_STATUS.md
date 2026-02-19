# Schedule A/B fill status

Run `node scripts/report-schedule-ab-fill.mjs` to regenerate the PDF and get current numbers.

## Current numbers (from last report)

| Metric | Value |
|--------|--------|
| **Total template fields** | 368 |
| **Filled (non-empty or checked)** | 58 |
| **Fill rate** | **15.8%** |
| **Correct mapping** | We set 111 field names that exist in the template; 47 of those get value from seed/data (rest are "None" checkboxes or conditional). |
| **Wrong mapping** | 0 — every field name we use exists in `form_b106ab.pdf`. |
| **Not mapped** | 246 template fields — we have no code path and/or no intake data for them. |

## What we fill today (from seed)

- **Part 1 Real property:** First property address (`1 1`), type (`1 1a`), county (`1_2`), value (`1_3`), ownership (`1_4`). Second property when present: `2_2`, `2_3`, `2_4`.
- **Part 2 Vehicles:** First vehicle description (`3 1`), mileage (`3 2`), value (`3 4`). Second vehicle: `3_2` (description), `3_3` (value).
- **Part 3 Personal property (Q6–15):** Household categories 6–14 (description + amount). "None" checkboxes (`6 check` … `14 check`) for lines with no data.
- **Part 4 Financial (Q16–35):** Cash (`16 Cash amount` or `Check 16`), checking/savings (`17.1`–`17.4`), retirement (21.1–21.7), security deposits (22.x), tax refunds (28), other (35). We set "None" checkboxes for 18–20, 23–27, 29–35 where we have no data.
- **Business / farm (36–52):** Not mapped — no intake or mapping.
- **Totals:** Not mapped — form has total fields we don’t compute/fill yet.

## Missing / don’t know

- **Part 1:** Second/third property, property type (1 1a), county/ownership (1_2, 1_4). Intake has one property; we could add mapping for 1_2/1_4 if we have ownership/type in canonical.
- **Part 2:** Second vehicle (2_2, 2_3, 2_4), ownership (3_2, 3_3). Intake has two vehicles; we only fill the first.
- **Part 3:** Some checkboxes and line 12/13/14/15. We fill 6–14 description/amount from household grid; 12–15 may be different layout.
- **Part 4:** Stocks (18), non-public stock (19), bonds (20), annuities (23), education IRA (24), trusts (25), patents (26), licenses (27), family support (29), other (30–34) — we set "None" or leave empty. No intake for these unless we add questions.
- **Business/farm (36–52):** No mapping or intake.
- **Totals:** Need to compute and set total fields (e.g. 55, 63) from scheduleA.totalValue / scheduleB.totalValue once we know exact field names.

## Master plan

See **[FULL_COMPLETION_PLAN.md](FULL_COMPLETION_PLAN.md)** for the plan to fix every problem, raise fill rate to full completion, and make the app work for any client with form-change resilience (questionnaires + attorney + OCR; inspection-driven mapping).

## How to iterate

1. **Run report:** `node scripts/report-schedule-ab-fill.mjs` — prints fill rate and lists empty sections.
2. **Run test:** `npm run test:schedule-ab` or `node scripts/test-schedule-ab.mjs` — fails if any gold assertion breaks.
3. **Inspect PDF:** `WRITE_SCHEDULE_AB=1 npm run test:schedule-ab` then open `tmp/schedule-ab-output.pdf`.
4. To **increase fill rate:** add mapping in `src/export/fillScheduleAB.ts` for the template field names in `docs/form-fields/form_b106ab.json`, and add intake/seed for any new data (e.g. second vehicle, totals).

## Bug fix applied

- **Security deposit amount:** Seed had "Duke Energy ($250 deposit), Landlord ($1500 security deposit)". The parser was concatenating digits into one number. It now uses `parseCurrencySum()` so multiple amounts are summed ($1,750).
