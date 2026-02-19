import { Answers } from '../form/types';
import {
    Vehicle,
    FinancialAccount,
    BankAccountType,
    HouseholdItem,
    SecurityDeposit,
    RetirementAccount,
    TaxRefund,
    OtherAsset,
    OwnershipType
} from '../form/assetTypes';
import { parseCurrency, parseCurrencySum, sumAssets } from './calculations';

/** Single business or farm asset line for Schedule A/B Parts 5–6. */
export interface BusinessFarmAsset {
    description: string;
    value: number;
}

export interface ScheduleBData {
    vehicles: Vehicle[];
    financialAccounts: FinancialAccount[];
    securityDeposits: SecurityDeposit[];
    householdItems: HouseholdItem[];
    retirementAccounts: RetirementAccount[];
    taxRefunds: TaxRefund[];
    otherAssets: OtherAsset[];
    cashOnHand: number;
    totalValue: number;
    /** Part 5: business property (Q36–45). */
    businessAssets: BusinessFarmAsset[];
    /** Part 6: farm / commercial fishing (Q46–52). */
    farmAssets: BusinessFarmAsset[];
}

export function parseCash(answers: Answers): number {
    const val = answers['cash_on_hand'] as string;
    return parseCurrency(val);
}

export function parseSecurityDeposits(answers: Answers): SecurityDeposit[] {
    const has = answers['security_deposits'] === 'Yes, I have security deposits (e.g., rent, utilities)';
    if (!has) return [];

    const details = (answers['security_deposit_details'] as string) || '';
    if (!details) return [];

    // Simple parser: treat the whole details block as one item if we can't parse multiple.
    // Ideally user inputs "Landlord: $500".
    // Let's just create one generic item for now unless we structure the input more.
    // For Schedule A/B generation, we can just put the whole text in description.

    // Sum all dollar amounts in the details (e.g. "$250 deposit, Landlord $1500" -> 1750).
    const amount = parseCurrencySum(details);

    return [{
        id: 'security_deposit_1',
        assetType: 'SecurityDeposit',
        ownership: 'Debtor',
        holderName: 'See details',
        value: amount,
        description: details
    }];
}

export function parseRetirementAccounts(answers: Answers): RetirementAccount[] {
    const details = (answers['retirement_details'] as string) || '';
    if (!details) return [];

    // Simple line-based parser
    // "Fidelity 401k: $34,000"
    const lines = details.split('\n').filter(l => l.trim().length > 0);
    return lines.map((line, idx) => {
        // Extract value from part after colon if exists, or last word?
        // safer to look for last $? 
        // Simple: Split by :
        const parts = line.split(':');
        const valStr = parts.length > 1 ? parts[1] : line;
        const val = parseCurrency(valStr);

        const type = line.toLowerCase().includes('401k') ? '401k'
            : line.toLowerCase().includes('ira') ? 'IRA'
                : line.toLowerCase().includes('pension') ? 'Pension'
                    : 'Other';
        return {
            id: `retirement_${idx}`,
            assetType: 'RetirementAccount',
            ownership: 'Debtor',
            type,
            institution: line.split(':')[0] || 'Unknown',
            value: val,
            description: line
        };
    });
}

/** Single source of truth for tax refund year: intake answer or current calendar year. */
function getTaxYearForRefunds(answers: Answers): string {
    const fromAnswers = answers['tax_refund_year'] as string | undefined;
    if (fromAnswers && String(fromAnswers).trim()) return String(fromAnswers).trim();
    return new Date().getFullYear().toString();
}

export function parseTaxRefunds(answers: Answers): TaxRefund[] {
    const details = (answers['tax_refunds_details'] as string) || '';
    if (!details) return [];

    const taxYear = getTaxYearForRefunds(answers);
    const lines = details.split('\n').filter(l => l.trim().length > 0);
    return lines.map((line, idx) => {
        const parts = line.split(':');
        const valStr = parts.length > 1 ? parts[1] : line;
        const val = parseCurrency(valStr);

        const type = line.toLowerCase().includes('federal') ? 'Federal'
            : line.toLowerCase().includes('state') ? 'State'
                : 'Local';
        return {
            id: `tax_refund_${idx}`,
            assetType: 'TaxRefund',
            ownership: 'Debtor',
            year: taxYear,
            type,
            value: val,
            description: line
        };
    });
}

export function parseOtherAssets(answers: Answers): OtherAsset[] {
    const lifeDetails = (answers['life_insurance_details'] as string) || '';
    const otherDetails = (answers['financial_assets_details'] as string) || '';

    const results: OtherAsset[] = [];

    if (lifeDetails) {
        const parts = lifeDetails.split(':');
        const valStr = parts.length > 1 ? parts[1] : lifeDetails;

        results.push({
            id: 'life_insurance',
            assetType: 'OtherAsset',
            ownership: 'Debtor',
            type: 'Life Insurance',
            value: parseCurrency(valStr),
            description: lifeDetails
        });
    }

    if (otherDetails) {
        const parts = otherDetails.split(':');
        const valStr = parts.length > 1 ? parts[1] : otherDetails;

        results.push({
            id: 'other_financial_misc',
            assetType: 'OtherAsset',
            ownership: 'Debtor', // could contain "Other assets"
            type: 'Other',
            value: parseCurrency(valStr),
            description: otherDetails
        });
    }

    return results;
}

// ---------- Vehicles ----------
export function parseVehicles(answers: Answers): Vehicle[] {
    const v = answers['vehicles'];
    const hasV = v === 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)';
    if (!hasV) return [];

    const countStr = answers['vehicle_count'] as string;
    const count = parseInt(countStr || '0', 10);
    if (!count) return [];

    const results: Vehicle[] = [];
    for (let i = 1; i <= count; i++) {
        const year = (answers[`vehicle_${i}_year`] as string) || '';
        const make = (answers[`vehicle_${i}_make`] as string) || '';
        const model = (answers[`vehicle_${i}_model`] as string) || '';
        const vin = (answers[`vehicle_${i}_vin`] as string);
        const mileageStr = answers[`vehicle_${i}_mileage`] as string;
        const valueStr = answers[`vehicle_${i}_value`] as string;

        // Ownership default
        let ownership = (answers[`vehicle_${i}_ownership`] as OwnershipType) || 'Debtor';

        const vehicle: Vehicle = {
            id: `vehicle_${i}`,
            assetType: 'Vehicle',
            ownership,
            value: parseCurrency(valueStr),
            year,
            make,
            model,
            vin,
            mileage: mileageStr ? parseInt(mileageStr.replace(/[^0-9]/g, ''), 10) : undefined,
            description: `${year} ${make} ${model} ${vin ? `(VIN: ${vin})` : ''}`,
        };
        results.push(vehicle);
    }
    return results;
}

// ---------- Financial Accounts ----------
export function parseFinancialAccounts(answers: Answers): FinancialAccount[] {
    const hasBank = answers['bank_accounts'] === 'Yes, I have bank accounts';
    if (!hasBank) return [];

    const countStr = answers['bank_account_count'] as string;
    const count = parseInt(countStr || '0', 10);
    if (!count) return [];

    const results: FinancialAccount[] = [];
    for (let i = 1; i <= count; i++) {
        const institution = (answers[`account_${i}_institution`] as string) || '';
        const type = (answers[`account_${i}_type`] as BankAccountType) || 'Other';
        const last4 = (answers[`account_${i}_last4`] as string);
        const balanceStr = answers[`account_${i}_balance`] as string;

        let ownership = (answers[`account_${i}_ownership`] as OwnershipType) || 'Debtor';

        const account: FinancialAccount = {
            id: `account_${i}`,
            assetType: 'FinancialAccount',
            ownership,
            value: parseCurrency(balanceStr),
            institutionName: institution,
            accountType: type,
            last4Digits: last4,
            description: `${type} Account at ${institution} ${last4 ? `(x${last4})` : ''}`,
        };
        results.push(account);
    }
    return results;
}

// ---------- Household Goods ----------
const HOUSEHOLD_RANGE_VALUES: Record<string, number> = {
    '0_500': 250,
    '501_2500': 1500,
    '2501_5000': 3750,
    'over_5000': 6000,
};

const HOUSEHOLD_LABELS: Record<string, string> = {
    'furniture': 'Furniture',
    'electronics': 'Electronics',
    'appliances': 'Appliances',
    'clothing': 'Clothing',
    'tools': 'Tools & Equipment',
    'books_media': 'Books & Media',
    'sports': 'Sports Equipment',
    'firearms': 'Firearms',
    'animals': 'Animals / Pets',
    'collectibles': 'Collectibles',
    'other': 'Other Household Items',
};

export function parseHouseholdItems(answers: Answers): HouseholdItem[] {
    const grid = answers['household_property'] as Record<string, string>;
    if (!grid) return [];

    const results: HouseholdItem[] = [];

    Object.entries(grid).forEach(([category, rangeId]) => {
        if (!rangeId) return; // Skip if no selection? Or assume specific meaning? Usually required.

        const estValue = HOUSEHOLD_RANGE_VALUES[rangeId] || 0;
        const label = HOUSEHOLD_LABELS[category] || category;

        // Household items usually assumed Debtor unless specified? 
        // The grid doesn't ask for ownership per row. 
        // Defaults to Debtor or Joint if joint filing? 
        // For simplicity, we'll mark as Debtor for now, as splitting pots and pans is rare in simple intakes.
        // TODO: Add logic to check isJointFiling and maybe default to Joint for household goods?
        const ownership: OwnershipType = 'Debtor';

        const item: HouseholdItem = {
            id: `household_${category}`,
            assetType: 'HouseholdItem',
            category: category as any, // Cast to strict union if needed, or let string pass
            ownership,
            value: estValue,
            description: `${label}: estimated value $${estValue.toLocaleString()} (range ${rangeId.replace('_', '–')})`,
        };
        results.push(item);
    });

    return results;
}

// ---------- Business and farm (Schedule A/B Parts 5–6) ----------
function parseBusinessFarmAssets(answers: Answers): BusinessFarmAsset[] {
    if (answers['business_or_farm'] !== 'Yes') return [];
    const description = String(answers['business_farm_description'] ?? '').trim();
    const valueStr = String(answers['business_farm_value'] ?? '').trim();
    const value = parseCurrency(valueStr);
    if (!description && !value) return [];
    return [{ description: description || 'Business/farm asset', value: value || 0 }];
}

// ---------- Master Mapper ----------
export function mapAssetsToScheduleB(answers: Answers): ScheduleBData {
    const vehicles = parseVehicles(answers);
    const financialAccounts = parseFinancialAccounts(answers);
    const householdItems = parseHouseholdItems(answers);
    const cashOnHand = parseCash(answers);
    const securityDeposits = parseSecurityDeposits(answers);
    const retirementAccounts = parseRetirementAccounts(answers);
    const taxRefunds = parseTaxRefunds(answers);
    const otherAssets = parseOtherAssets(answers);
    const businessAssets = parseBusinessFarmAssets(answers);
    const farmAssets: BusinessFarmAsset[] = []; // Same intake could be extended for farm separately; for now only business

    const totalValue = sumAssets(vehicles) +
        sumAssets(financialAccounts) +
        sumAssets(householdItems) +
        cashOnHand +
        sumAssets(securityDeposits) +
        sumAssets(retirementAccounts) +
        sumAssets(taxRefunds) +
        sumAssets(otherAssets) +
        businessAssets.reduce((s, a) => s + a.value, 0) +
        farmAssets.reduce((s, a) => s + a.value, 0);

    return {
        vehicles,
        financialAccounts,
        householdItems,
        cashOnHand,
        securityDeposits,
        retirementAccounts,
        taxRefunds,
        otherAssets,
        totalValue,
        businessAssets,
        farmAssets,
    };
}
