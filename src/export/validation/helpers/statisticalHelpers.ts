/**
 * Helper functions for auto-calculating Form 101 statistical estimates
 */

import type { Answers } from '../../form/types';

/**
 * Estimate creditor count from creditor lists
 */
export function estimateCreditorCount(answers: Answers): string {
    let count = 0;

    // Parse unsecured creditors
    const unsecured = String(answers['unsecured_creditors'] ?? '');
    if (unsecured.trim()) {
        // Count semicolons as creditor separators, plus 1
        count += (unsecured.match(/;/g) || []).length + 1;
    }

    // Add secured creditors
    const vehicleLoan1 = String(answers['vehicle_1_loan'] ?? '').toLowerCase();
    const vehicleLoan2 = String(answers['vehicle_2_loan'] ?? '').toLowerCase();
    if (vehicleLoan1 === 'yes') count++;
    if (vehicleLoan2 === 'yes') count++;

    // Add other secured
    const otherSecured = answers['other_secured_debts'];
    if (Array.isArray(otherSecured)) {
        count += otherSecured.length;
    }

    // Add priority debts
    const priority = answers['priority_debts'];
    if (Array.isArray(priority)) {
        count += priority.length;
    }

    // Return range
    if (count === 0) return '';
    if (count <= 49) return '1-49';
    if (count <= 99) return '50-99';
    if (count <= 199) return '100-199';
    if (count <= 999) return '200-999';
    return '1000+';
}

/**
 * Estimate total assets
 */
export function estimateAssets(answers: Answers): string {
    let total = 0;

    // Bank accounts
    const bankCount = parseInt(String(answers['bank_account_count'] ?? '0'), 10);
    for (let i = 1; i <= bankCount; i++) {
        const balance = parseFloat(String(answers[`account_${i}_balance`] ?? '0').replace(/,/g, ''));
        if (!isNaN(balance)) total += balance;
    }

    // Vehicles
    const vehicleCount = parseInt(String(answers['vehicle_count'] ?? '0'), 10);
    for (let i = 1; i <= vehicleCount; i++) {
        const value = parseFloat(String(answers[`vehicle_${i}_value`] ?? '0').replace(/,/g, ''));
        if (!isNaN(value)) total += value;
    }

    // Real estate (simplified - would need actual values)
    const realEstateCount = parseInt(String(answers['real_estate_count'] ?? '0'), 10);
    for (let i = 1; i <= realEstateCount; i++) {
        const value = parseFloat(String(answers[`property_${i}_value`] ?? '0').replace(/,/g, ''));
        if (!isNaN(value)) total += value;
    }

    // Return range
    if (total === 0) return '';
    if (total <= 50000) return '$0-$50,000';
    if (total <= 100000) return '$50,001-$100,000';
    if (total <= 500000) return '$100,001-$500,000';
    if (total <= 1000000) return '$500,001-$1 million';
    if (total <= 10000000) return '$1,000,001-$10 million';
    if (total <= 50000000) return '$10,000,001-$50 million';
    if (total <= 100000000) return '$50,000,001-$100 million';
    if (total <= 500000000) return '$100,000,001-$500 million';
    if (total <= 1000000000) return '$500,000,001-$1 billion';
    return 'More than $1 billion';
}

/**
 * Estimate total liabilities (debts)
 */
export function estimateLiabilities(answers: Answers): string {
    let total = 0;

    // Parse unsecured debts (very rough estimate from text)
    const unsecured = String(answers['unsecured_creditors'] ?? '');
    const amounts = unsecured.match(/\$[\d,]+/g) || [];
    amounts.forEach(amt => {
        const num = parseFloat(amt.replace(/[$,]/g, ''));
        if (!isNaN(num)) total += num;
    });

    // Vehicle loans
    const vehicleCount = parseInt(String(answers['vehicle_count'] ?? '0'), 10);
    for (let i = 1; i <= vehicleCount; i++) {
        if (String(answers[`vehicle_${i}_loan`] ?? '').toLowerCase() === 'yes') {
            // Estimate 70% of vehicle value as typical loan
            const value = parseFloat(String(answers[`vehicle_${i}_value`] ?? '0').replace(/,/g, ''));
            if (!isNaN(value)) total += value * 0.7;
        }
    }

    // Mortgage debts
    const realEstateCount = parseInt(String(answers['real_estate_count'] ?? '0'), 10);
    for (let i = 1; i <= realEstateCount; i++) {
        const mortgage = parseFloat(String(answers[`property_${i}_mortgage`] ?? '0').replace(/,/g, ''));
        if (!isNaN(mortgage)) total += mortgage;
    }

    // Return range
    if (total === 0) return '';
    if (total <= 50000) return '$0-$50,000';
    if (total <= 100000) return '$50,001-$100,000';
    if (total <= 500000) return '$100,001-$500,000';
    if (total <= 1000000) return '$500,001-$1 million';
    if (total <= 10000000) return '$1,000,001-$10 million';
    if (total <= 50000000) return '$10,000,001-$50 million';
    if (total <= 100000000) return '$50,000,001-$100 million';
    if (total <= 500000000) return '$100,000,001-$500 million';
    if (total <= 1000000000) return '$500,000,001-$1 billion';
    return 'More than $1 billion';
}

/**
 * Determine debt nature (consumer vs business) from creditor details
 */
export function determineDebtNature(answers: Answers): 'consumer' | 'business' | 'both' | '' {
    const unsecured = String(answers['unsecured_creditors'] ?? '').toLowerCase();

    // Keywords suggesting business debts
    const businessKeywords = ['llc', 'inc', 'corp', 'vendor', 'supplier', 'business', 'commercial'];
    const hasBusinessIndicators = businessKeywords.some(kw => unsecured.includes(kw));

    // Keywords suggesting consumer debts
    const consumerKeywords = ['credit card', 'medical', 'personal loan', 'car loan', 'mortgage'];
    const hasConsumerIndicators = consumerKeywords.some(kw => unsecured.includes(kw));

    if (hasBusinessIndicators && hasConsumerIndicators) return 'both';
    if (hasBusinessIndicators) return 'business';
    if (hasConsumerIndicators) return 'consumer';

    // Default to consumer if unclear
    return unsecured.trim() ? 'consumer' : '';
}
