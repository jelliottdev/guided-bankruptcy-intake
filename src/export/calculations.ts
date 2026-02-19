import { AssetBase } from '../form/assetTypes';

/**
 * Parse a single numeric value from string or number (strips non-numeric except . -).
 */
export function parseCurrency(value: string | number | undefined): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    const clean = value.replace(/[^0-9.-]+/g, '');
    return parseFloat(clean) || 0;
}

/**
 * Parse all dollar amounts from a string (e.g. "$250 and $1,500") and return their sum.
 * Use for fields that list multiple amounts in one blob (e.g. security deposit details).
 */
export function parseCurrencySum(value: string | undefined): number {
    if (value === undefined || value === null || value === '') return 0;
    const matches = value.match(/\$?\s*[\d,]+(?:\.\d{2})?/g) || [];
    return matches.reduce((sum, m) => {
        const n = parseFloat(m.replace(/[,$\s]/g, '')) || 0;
        return sum + n;
    }, 0);
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(value);
}

/**
 * Sum value of a list of assets
 */
export function sumAssets(assets: AssetBase[]): number {
    return assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
}

/**
 * Safe split of "Debtor", "Spouse", "Joint" into boolean flags
 * Returns [debtor, spouse, joint]
 */
export function getOwnershipFlags(ownership: string): { debtor: boolean; spouse: boolean; joint: boolean } {
    const lower = ownership?.toLowerCase() || '';
    return {
        debtor: lower === 'debtor' || lower === 'self',
        spouse: lower === 'spouse',
        joint: lower === 'joint' || lower === 'community',
    };
}
