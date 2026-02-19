import { PDFDocument } from 'pdf-lib';
import type { CaseCanonical } from '../engine/types';
import { ScheduleAData } from './scheduleA';
import { ScheduleBData } from './scheduleB';
import { formatCurrency } from './calculations';
import { resolveScheduleABField as F, getScheduleABPdfFieldName } from '../engine/mapping/scheduleABFieldMap';

function formatFullName(name: { first?: string; middle?: string; last?: string; suffix?: string }): string {
    if (!name) return '';
    const parts = [name.first, name.middle, name.last].filter(Boolean) as string[];
    let full = parts.join(' ').trim();
    if (name.suffix && String(name.suffix).trim()) full = `${full} ${String(name.suffix).trim()}`;
    return full;
}

export async function fillScheduleAB(
    pdfDoc: PDFDocument,
    scheduleA: ScheduleAData,
    scheduleB: ScheduleBData,
    canonical?: CaseCanonical
) {
    const form = pdfDoc.getForm();

    // Helper to safely set text
    const setText = (name: string, value: string | number | undefined) => {
        try {
            const field = form.getTextField(name);
            if (value !== undefined) {
                field.setText(String(value));
            }
        } catch (e) {
            console.warn(`Field ${name} not found in PDF`);
        }
    };

    // Helper to safely check box
    const setCheck = (name: string, check: boolean) => {
        try {
            const field = form.getCheckBox(name);
            if (check) field.check();
            else field.uncheck();
        } catch (e) {
            console.warn(`Checkbox ${name} not found in PDF`);
        }
    };

    // Helper to safely set dropdown (exact option match)
    const setDropdown = (name: string, value: string) => {
        try {
            const field = form.getDropdown(name);
            const options = field.getOptions();
            const match = options.find((o: string) => o === value || (o && String(o).trim() === value));
            if (match !== undefined) field.select(match);
        } catch (e) {
            console.warn(`Dropdown ${name} not found or option not found`);
        }
    };

    // ---------- Header (court-ready) ----------
    if (canonical) {
        setText(F('header.debtor1_name'), formatFullName(canonical.debtor1?.name));
        setText(F('header.debtor2_name'), canonical.debtor2 ? formatFullName(canonical.debtor2.name) : '');
        if (canonical.filing?.caseNumber) setText(F('header.case_number'), canonical.filing.caseNumber);
        if (canonical.filing?.district) setDropdown(F('header.district'), canonical.filing.district);
    }

    // ---------- Part 1: Real Estate ----------
    const prop = scheduleA.properties[0];
    if (prop) {
        const addressLine = (prop.address.street || '').trim();
        setText(F('real_property.1.address'), addressLine);
        setText(F('real_property.1.city'), prop.address.city || '');
        setText(F('real_property.1.state'), prop.address.state || '');
        setText(F('real_property.1.zip'), prop.address.zip || '');
        setText(F('real_property.1.county'), prop.address.county || '');
        setText(F('real_property.1.value'), formatCurrency(prop.value));
        setText(F('real_property.1.value_portion'), formatCurrency(prop.value)); // portion = entire when 100% or no fraction data
        setText(F('real_property.1.type'), prop.propertyType || '');
        setText(F('real_property.1.ownership_description'), prop.ownership || '');
        // Property type checkboxes (check exactly one that matches)
        const pt = (prop.propertyType || '').toLowerCase();
        if (pt.includes('single') || pt.includes('family')) {
            setCheck(F('real_property.1.type_singlefamily'), true);
        } else if (pt.includes('condo') || pt.includes('townhome')) {
            setCheck(F('real_property.1.type_condo'), true);
        } else if (pt === 'land') {
            setCheck(F('real_property.1.type_land'), true);
        } else if (pt.includes('manufactured') || pt.includes('mobile')) {
            setCheck(F('real_property.1.type_manufactured'), true);
        } else if (pt === 'timeshare') {
            setCheck(F('real_property.1.type_timeshare'), true);
        } else if (pt.includes('multi') || pt.includes('duplex')) {
            setCheck(F('real_property.1.type_duplex'), true);
        } else if (pt.includes('commercial') || pt.includes('investment')) {
            setCheck(F('real_property.1.type_investment'), true);
        } else {
            setCheck(F('real_property.1.type_other'), true);
        }
        // Who has an interest in the property? Check exactly one.
        setCheck(F('real_property.1.interest_debtor1_only'), prop.ownership === 'Debtor');
        setCheck(F('real_property.1.interest_debtor2_only'), prop.ownership === 'Spouse');
        setCheck(F('real_property.1.interest_joint'), prop.ownership === 'Joint');
        setCheck(F('real_property.1.interest_another'), prop.ownership === 'Community');
    }
    const prop2 = scheduleA.properties[1];
    if (prop2) {
        const addressLine2 = (prop2.address.street || '').trim();
        setText(F('real_property.2.address'), addressLine2);
        setText(F('real_property.2.city'), prop2.address.city || '');
        setText(F('real_property.2.state'), prop2.address.state || '');
        setText(F('real_property.2.zip'), prop2.address.zip || '');
        setText(F('real_property.2.county'), prop2.address.county || '');
        setText(F('real_property.2.value'), formatCurrency(prop2.value));
    }

    // ---------- Part 2: Vehicles (Schedule B) ----------
    const vehicle = scheduleB.vehicles[0];
    if (vehicle) {
        const desc = `${vehicle.year} ${vehicle.make} ${vehicle.model} \nVIN: ${vehicle.vin || 'N/A'}`;
        setText(F('vehicles.1.description'), desc);
        setText(F('vehicles.1.mileage'), vehicle.mileage ? `${vehicle.mileage} miles` : '');
        setText(F('vehicles.1.value'), formatCurrency(vehicle.value));
    }
    const vehicle2 = scheduleB.vehicles[1];
    if (vehicle2) {
        const desc2 = `${vehicle2.year} ${vehicle2.make} ${vehicle2.model}${vehicle2.vin ? ` VIN: ${vehicle2.vin}` : ''}`;
        setText(F('vehicles.2.description'), desc2);
        setText(F('vehicles.2.value'), formatCurrency(vehicle2.value));
    }

    // ---------- Part 4: Financial Assets (Q16-35) ----------

    // ---------- Part 4: Financial (Q16–35) ----------
    if (scheduleB.cashOnHand > 0) {
        setText(F('financial.cash.amount'), formatCurrency(scheduleB.cashOnHand));
    } else {
        setCheck(F('financial.cash.none'), true);
    }

    const accounts = scheduleB.financialAccounts;
    let checkingIdx = 1;
    let otherIdx = 6;
    if (accounts.length === 0) {
        setCheck(F('financial.accounts.none'), true);
    } else {
        accounts.forEach(acc => {
            if (acc.accountType === 'Checking' || acc.accountType === 'Savings') {
                if (checkingIdx <= 4) {
                    setText(F(`financial.checking.${checkingIdx}.account` as 'financial.checking.1.account'), acc.description || '');
                    setText(F(`financial.checking.${checkingIdx}.amount` as 'financial.checking.1.amount'), formatCurrency(acc.value));
                    checkingIdx++;
                }
            } else {
                if (otherIdx <= 9) {
                    const keyA = otherIdx as 6 | 7 | 8 | 9;
                    setText(F(`financial.other.${keyA}.account`), acc.description || '');
                    setText(F(`financial.other.${keyA}.amount`), formatCurrency(acc.value));
                    otherIdx++;
                }
            }
        });
    }

    setCheck(F('financial.stocks_bonds.none'), true);
    setCheck(F('financial.non_public_stock.none'), true);
    setCheck(F('financial.bonds.none'), true);

    const retirements = scheduleB.retirementAccounts;
    if (retirements.length === 0) {
        setCheck(F('financial.retirement.none'), true);
    } else {
        retirements.forEach(r => {
            const desc = `${r.institution} (${r.type})`;
            const val = formatCurrency(r.value);
            if (r.type === '401k') {
                setText(F('financial.retirement.401k.desc'), desc);
                setText(F('financial.retirement.401k.amount'), val);
            } else if (r.type === 'Pension') {
                setText(F('financial.retirement.pension.desc'), desc);
                setText(F('financial.retirement.pension.amount'), val);
            } else if (r.type === 'IRA') {
                setText(F('financial.retirement.ira.desc'), desc);
                setText(F('financial.retirement.ira.amount'), val);
            } else if (r.type === 'Keogh') {
                setText(F('financial.retirement.keogh.desc'), desc);
                setText(F('financial.retirement.keogh.amount'), val);
            } else {
                setText(F('financial.retirement.other.desc'), desc);
                setText(F('financial.retirement.other.amount'), val);
            }
        });
    }

    const deposits = scheduleB.securityDeposits;
    if (deposits.length === 0) {
        setCheck(F('financial.security_deposits.none'), true);
    } else {
        deposits.forEach((d) => {
            const lowerDesc = d.description?.toLowerCase() || '';
            const val = formatCurrency(d.value);
            if (lowerDesc.includes('utility') || lowerDesc.includes('electric') || lowerDesc.includes('power')) {
                setText(F('financial.security_deposits.electric.desc'), d.description || 'Electric Utility');
                setText(F('financial.security_deposits.electric.amount'), val);
            } else if (lowerDesc.includes('rent') || lowerDesc.includes('lease') || lowerDesc.includes('landlord')) {
                setText(F('financial.security_deposits.rental.desc'), d.description || 'Landlord');
                setText(F('financial.security_deposits.rental.amount'), val);
            } else {
                setText(F('financial.security_deposits.other.desc'), d.description || 'Other Deposit');
                setText(F('financial.security_deposits.other.amount'), val);
            }
        });
    }

    setCheck(F('financial.annuities.none'), true);
    setCheck(F('financial.education_ira.none'), true);
    setCheck(F('financial.trusts.none'), true);
    setCheck(F('financial.patents.none'), true);
    setCheck(F('financial.licenses.none'), true);

    const refunds = scheduleB.taxRefunds;
    if (refunds.length === 0) {
        setCheck(F('financial.tax_refunds.none'), true);
    } else {
        refunds.forEach((r, idx) => {
            if (idx === 0) {
                setText(F('financial.tax_refunds.desc'), `${r.type} ${r.year} (${r.description})`);
                setText(F('financial.tax_refunds.amount1'), formatCurrency(r.value));
            } else {
                const amountKey = idx === 1 ? 'financial.tax_refunds.amount2' : 'financial.tax_refunds.amount3';
                setText(F(amountKey), formatCurrency(r.value));
            }
        });
    }

    setCheck(F('financial.family_support.none'), true);
    setCheck(F('financial.other_amounts.none'), true);

    const others = scheduleB.otherAssets;
    if (others.length === 0) {
        setCheck(F('financial.other_assets.none'), true);
    } else {
        const combined = others.map(o => `${o.type}: ${o.description} ($${o.value})`).join('; ');
        setText(F('financial.other_assets.text'), combined);
    }

    // ---------- Part 3: Household Goods (Q6–14) ----------
    const categoryMap: Record<string, number> = {
        'Furniture': 6, 'household': 6, 'appliances': 6,
        'Electronics': 7, 'electronics': 7,
        'Collectibles': 8, 'collectibles': 8, 'books_media': 8,
        'Tools': 9, 'tools': 9, 'Sports Equipment': 9, 'sports': 9,
        'Firearms': 10, 'firearms': 10,
        'Clothing': 11, 'clothing': 11,
        'Jewelry': 12, 'jewelry': 12,
        'Animals': 13, 'animals': 13,
        'Other': 14, 'other': 14,
    };

    const filledHouseholdLines = new Set<number>();
    scheduleB.householdItems.forEach(item => {
        let line = categoryMap[item.category as string] ?? 14;
        setText(F(`household.${line}.description`), item.description || '');
        setText(F(`household.${line}.amount`), formatCurrency(item.value));
        filledHouseholdLines.add(line);
    });
    for (let line = 6; line <= 14; line++) {
        if (!filledHouseholdLines.has(line)) {
            setCheck(F(`household.${line}.check`), true);
        }
    }

    // ---------- Part 5: Business property (Q36–45) ----------
    if (scheduleB.businessAssets.length === 0) {
        setCheck(F('business.none.37'), true);
        setCheck(F('business.none.38'), true);
        setCheck(F('business.none.39'), true);
        setCheck(F('business.none.40'), true);
        setCheck(F('business.none.41'), true);
        setCheck(F('business.none.42'), true);
    } else {
        const first = scheduleB.businessAssets[0];
        const desc = first.description + (first.value > 0 ? ` (${formatCurrency(first.value)})` : '');
        setText(F('business.details'), desc);
    }

    // ---------- Part 6: Farm / commercial fishing (Q46–52) ----------
    if (scheduleB.farmAssets.length === 0) {
        setCheck(F('farm.none.46'), true);
        setCheck(F('farm.none.47'), true);
        setCheck(F('farm.none.48'), true);
        setCheck(F('farm.none.49'), true);
        setCheck(F('farm.none.50'), true);
        setCheck(F('farm.none.51'), true);
    } else {
        const first = scheduleB.farmAssets[0];
        const desc = first.description + (first.value > 0 ? ` (${formatCurrency(first.value)})` : '');
        setText(F('farm.details'), desc);
    }

    // ---------- Part 8: Totals (only when manifest-verified field names exist) ----------
    const realEstateTotalField = getScheduleABPdfFieldName('total.real_estate');
    if (realEstateTotalField) setText(realEstateTotalField, formatCurrency(scheduleA.totalValue));
    const personalPropertyTotalField = getScheduleABPdfFieldName('total.personal_property');
    if (personalPropertyTotalField) setText(personalPropertyTotalField, formatCurrency(scheduleB.totalValue));
}
