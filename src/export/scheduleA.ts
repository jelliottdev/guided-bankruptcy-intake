import { Answers } from '../form/types';
import { RealProperty, RealPropertyType, OwnershipType } from '../form/assetTypes';
import { parseCurrency, sumAssets } from './calculations';

export interface ScheduleAData {
    properties: RealProperty[];
    totalValue: number;
}

/**
 * Extract RealProperty objects from flat Answers
 */
export function parseRealProperties(answers: Answers): RealProperty[] {
    const hasRE = answers['real_estate_ownership'] === 'Yes, I own real estate';
    if (!hasRE) return [];

    const countStr = answers['real_estate_count'] as string;
    const count = parseInt(countStr || '0', 10);
    if (!count) return [];

    const results: RealProperty[] = [];

    for (let i = 1; i <= count; i++) {
        const addressLine = (answers[`property_${i}_address`] as string) || '';
        const city = (answers[`property_${i}_city`] as string) || '';
        const state = (answers[`property_${i}_state`] as string) || '';
        const zip = (answers[`property_${i}_zip`] as string) || '';
        const county = (answers[`property_${i}_county`] as string) || '';

        // Ownership might be undefined if not joint filing, default to Debtor?
        // In strict mode we might want to check filing status, but for now defaulting is safer for data shape.
        const ownership = (answers[`property_${i}_ownership`] as OwnershipType) || 'Debtor';

        const propType = (answers[`property_${i}_type`] as RealPropertyType) || 'Other';
        const valueStr = answers[`property_${i}_value`] as string;
        const value = parseCurrency(valueStr);

        const hasMortgage = answers[`property_${i}_mortgage`] === 'Yes';
        const encumbranceStr = hasMortgage ? (answers[`property_${i}_mortgage_balance`] as string) : '0';
        const totalEncumbrance = parseCurrency(encumbranceStr);

        const property: RealProperty = {
            id: `property_${i}`,
            assetType: 'RealProperty',
            ownership,
            value,
            totalEncumbrance,
            propertyType: propType,
            address: {
                street: addressLine,
                city,
                state,
                zip,
                county,
            },
            description: `Property at ${addressLine}`,
            isExempt: false, // Default, would be set by Schedule C logic later
        };

        results.push(property);
    }

    return results;
}

/**
 * Map extracted properties to Schedule A structure
 * (This prepares data for the PDF filler)
 */
export function mapRealEstateToScheduleA(answers: Answers): ScheduleAData {
    const properties = parseRealProperties(answers);
    const totalValue = sumAssets(properties);

    return {
        properties,
        totalValue,
    };
}
