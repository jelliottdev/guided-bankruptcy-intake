import { CaseCanonicalType } from './types';

export type ValidationSeverity = 'Blocking' | 'Warning' | 'Info';

export interface ValidationIssue {
    code: string;
    severity: ValidationSeverity;
    message: string;
    fixAction?: {
        stepId: string; // e.g., 'filing'
        fieldId?: string; // e.g., 'credit_counseling'
    };
}

/**
 * The Deterministic Readiness Engine.
 * Takes a Canonical Case and outputs a definitive list of defects.
 */
export function validateCase(data: CaseCanonicalType): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Statutory Requirements (Hard Blocks)
    // Updated path: creditCounseling is now an object with debtor1/debtor2
    if (data.creditCounseling.debtor1.status === 'completed_no_cert') {
        issues.push({
            code: 'STAT_CC_CERT_MISSING',
            severity: 'Blocking',
            message: 'Credit Counseling completed but certificate is missing.',
            fixAction: { stepId: 'filing', fieldId: 'credit_counseling' }
        });
    }

    // Checking for completion status generally
    const ccStatus = data.creditCounseling.debtor1.status;
    if (ccStatus !== 'completed_with_cert' && ccStatus !== 'completed_no_cert') {
        issues.push({
            code: 'STAT_CC_MISSING',
            severity: 'Blocking',
            message: 'Credit Counseling is required.',
            fixAction: { stepId: 'filing', fieldId: 'credit_counseling' }
        });
    }

    // Paystubs - currently not in Zod schema directly, might need to check 'evidence' or similar in future
    // For now, we'll assume it's missing if not explicitly tracked, or add a stub to schema later.
    // Commenting out for now to align with Zod schema which lacks 'paystubs.received' at root level
    /*
    if (!data.statutory.paystubs.received) {
        issues.push({
            code: 'STAT_PAYSTUBS_MISSING',
            severity: 'Blocking',
            message: 'Payment Advices (Paystubs) for last 60 days are required.',
            fixAction: { stepId: 'income', fieldId: 'paystubs_upload' }
        });
    }
    */

    // 2. Form 101 (Voluntary Petition) Checks
    if (!data.debtor1.ssnLast4 || data.debtor1.ssnLast4.length !== 4) {
        issues.push({
            code: 'F101_SSN_INVALID',
            severity: 'Blocking',
            message: 'Debtor SSN (Last 4) is missing or invalid.',
            fixAction: { stepId: 'identity', fieldId: 'ssn' }
        });
    }

    if (!data.debtor1.address.county) {
        issues.push({
            code: 'F101_COUNTY_MISSING',
            severity: 'Blocking',
            message: 'County of residence is required for venue determination.',
            fixAction: { stepId: 'contact', fieldId: 'address_county' }
        });
    }

    // 3. Schedule A/B required fields (per form-requirements)
    const assets = data.assets as
        | { scheduleA?: { properties: Array<{ address?: { street?: string }; value?: number }> }; scheduleB?: { vehicles: Array<{ description?: string; value?: number }> } }
        | undefined;
    if (!assets?.scheduleA || !assets?.scheduleB) {
        issues.push({
            code: 'SCHAB_DATA_MISSING',
            severity: 'Blocking',
            message: 'Schedule A/B data is missing. Complete the assets and financial steps.',
            fixAction: { stepId: 'real_estate' }
        });
    } else {
        const prop0 = assets.scheduleA.properties?.[0];
        if (prop0 && (!prop0.address?.street?.trim() || (prop0.value ?? 0) <= 0)) {
            issues.push({
                code: 'SCHAB_REAL_PROPERTY_INCOMPLETE',
                severity: 'Blocking',
                message: 'First real property is missing address or value.',
                fixAction: { stepId: 'real_estate', fieldId: 'property_1_address' }
            });
        }
        const vehicle0 = assets.scheduleB.vehicles?.[0];
        if (vehicle0 && (!vehicle0.description?.trim() || (vehicle0.value ?? 0) <= 0)) {
            issues.push({
                code: 'SCHAB_VEHICLE_INCOMPLETE',
                severity: 'Blocking',
                message: 'First vehicle is missing description or value.',
                fixAction: { stepId: 'vehicles', fieldId: 'vehicle_1_value' }
            });
        }
    }

    // 4. Means Test (Eligibility)
    // Placeholder logic - income schema is currently a stub in Zod
    // Re-enable when income is fully fleshed out
    /*
    const annualized = data.income.currentMonthlyIncome * 12;
    if (annualized > 65000 && data.filing.chapter === '7') {
        issues.push({
            code: 'MT_PRESUMPTION_ABUSE',
            severity: 'Warning',
            message: `Income ($${annualized}) exceeds median. Presumption of abuse may arise.`,
            fixAction: { stepId: 'income' }
        });
    }
    */

    return issues;
}
