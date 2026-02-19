# Form → intake / source matrix

For each form we list **required logical fields** (or sections) and the **source** that populates them: intake key, attorney override, or OCR. This ensures every required form field has a data source and makes it easy to add new forms or OCR mappings.

## Schedule A/B (Form 106A/B)

| Logical field / section | Source (intake key or other) | Notes |
|--------------------------|------------------------------|--------|
| real_property.1.address, .value, .type, .county, .ownership | property_1_address, property_1_value, property_1_type, property_1_county, property_1_ownership | Real estate step |
| real_property.2.* | property_2_address, property_2_value, property_2_county | Second property when present |
| vehicles.1.description, .mileage, .value | vehicle_1_year/make/model/vin, vehicle_1_mileage, vehicle_1_value | Vehicles step |
| vehicles.2.* | vehicle_2_* | Second vehicle |
| financial.cash | cash_on_hand, Check 16 (None) | Financial assets step |
| financial.accounts | account_1_institution/type/balance … account_N_* | Bank accounts step |
| financial.retirement, security_deposits, tax_refunds, other_assets | retirement_details, security_deposit_details, tax_refunds_details, financial_assets_details, life_insurance_details | Financial assets step |
| household.6–14 | household_property (grid), 6 check … 14 check (None) | Household step |
| business.none_or_details | business_or_farm, business_farm_description, business_farm_value | Business and farm step |
| farm.none_or_details | (same; farm separate intake TBD) | business_farm_* for now |

**OCR:** Petition → debtor/address/chapter; bank statements → account balance; tax docs → income/refunds. Map via `src/ocr/fieldMapping.ts` to the intake keys above so Schedule A/B is populated from documents as well as questionnaires. See [OCR_PLEADINGS.md](OCR_PLEADINGS.md) for applying OCR with provenance and using pleadings for dev/seed.

## B101 (Form 101)

| Logical area | Source |
|--------------|--------|
| filing.chapter, feePayment, district | filing_chapter, filing_fee_method, debtor address/state (district) |
| reporting.debtType, estimatedCreditors, estimatedAssets, estimatedLiabilities | debt_nature, creditor_count_range, asset_range, liability_range |
| debtor1/2 name, address, SSN, contact | debtor_full_name, debtor_address, county, debtor_ssn_last4, debtor_phone, debtor_email; spouse_* for joint |
| attorney | Attorney profile (not questionnaire) |

---

## Forms not yet implemented (canonical source defined; intake/filler TBD)

Canonical schema now includes expansion types for the following; intake keys and fillers are to be added in dependency order.

### B106 Summary (Summary of Assets and Liabilities)

| Logical area | Source |
|--------------|--------|
| Total assets (Schedule A + B) | canonical.assets.scheduleA.totalValue, scheduleB.totalValue (computed) |
| Total liabilities (D + E/F) | canonical.securedDebts, unsecuredDebts (TBD intake: creditor steps) |
| Statistical info | Same as B101 reporting + schedules |

### B106C (Schedule C: Exemptions)

| Logical area | Source |
|--------------|--------|
| Property claimed as exempt, statute, value | canonical.exemptions (intake TBD: exemption selection step) |
| None / list | exemptions array or "None" checkbox |

### B106D (Schedule D: Secured Creditors)

| Logical area | Source |
|--------------|--------|
| Creditor name, address, claim, collateral | canonical.securedDebts (intake TBD: secured creditors step) |
| None | securedDebts.length === 0 |

### B106E/F (Schedule E/F: Unsecured Creditors)

| Logical area | Source |
|--------------|--------|
| Priority / nonpriority claims, name, address, amount | canonical.unsecuredDebts (intake TBD: unsecured creditors step) |
| None | unsecuredDebts.length === 0 |

### B106G (Schedule G: Executory Contracts and Unexpired Leases)

| Logical area | Source |
|--------------|--------|
| Name and address, description | canonical.executoryContracts (intake TBD) |
| None | executoryContracts.length === 0 |

### B106 Declaration (Declaration About Schedules)

| Logical area | Source |
|--------------|--------|
| Debtor name, declaration that schedules are accurate | canonical.debtor1/2, signature dates |
| Attorney / preparer | canonical.attorney or proSe |

### B107 (Statement of Financial Affairs)

| Logical area | Source |
|--------------|--------|
| SOFA questions 1–27 (or current form set) | canonical.sofa (intake TBD: SOFA questionnaire or per-question keys) |
| Answer text / None per question | sofa[].questionId, .answer |

### B108 (Statement of Intention — Chapter 7 only)

| Logical area | Source |
|--------------|--------|
| Secured debts: surrender / redeem / reaffirm | canonical.securedDebts + intention per claim (intake TBD) |
| Applies only when filing.chapter === '7' | Case type |

### B122A-1 (Chapter 7 Means Test)

| Logical area | Source |
|--------------|--------|
| Current monthly income, median, presumption | canonical.income, canonical.meansTest (intake: income/expense steps) |
| Line items | canonical.income.lineItems, expenses.lineItems |

### B122C-1 / B122C-2 (Chapter 13 Income and Disposable Income)

| Logical area | Source |
|--------------|--------|
| Current monthly income, disposable income calculation | canonical.income, canonical.expenses, canonical.meansTest |
| Applies only when filing.chapter === '13' | Case type |

### B121 (Statement About Social Security Numbers)

| Logical area | Source |
|--------------|--------|
| SSN (full or last 4 per court practice) | canonical.debtor1.ssnLast4, debtor2.ssnLast4; intake: debtor_ssn_last4, spouse_ssn |

### B103A / B103B (Filing Fee Installments / Waiver)

| Logical area | Source |
|--------------|--------|
| Fee payment method, installments / waiver justification | canonical.filing.feePayment; intake: filing_fee_method; waiver details TBD |

---

See also **Form → intake keys** in [FORM_SPEC_APPROACH.md](FORM_SPEC_APPROACH.md). When adding a new form, add a form-requirements spec, mapping (logical id → PDF name), and filler that reads from canonical; then add intake keys or attorney/OCR to this matrix so every required field has a source.
