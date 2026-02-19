/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Answers } from '../form/types';

// Legacy interface for backward compatibility
export interface ValidationIssue {
    id: string;
    fieldId: string;
    label: string;
    message: string;
    sectionId?: string; // Deep link target
    severity: 'critical' | 'warning';
}

// Legacy interface for backward compatibility  
export interface ValidationResult {
    ready: boolean;
    issues: ValidationIssue[];
}

function isEmpty(val: unknown): boolean {
    return !String(val ?? '').trim();
}

export function validateForm101(answers: Answers, uploadedFiles?: Record<string, any[]>): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Helper to check if files exist for a field
    const hasFiles = (fieldId: string): boolean => {
        const files = uploadedFiles?.[fieldId];
        return files != null && files.length > 0;
    };

    // --- Part 1: Identify Yourself ---

    // 1. Name
    const fullName = String(answers['debtor_full_name'] ?? '').trim();
    if (!fullName) {
        issues.push({
            id: 'debtor_name_missing',
            fieldId: 'debtor_full_name',
            label: 'Full Name',
            message: 'Full name is missing.',
            sectionId: 'identity',
            severity: 'critical',
        });
    }

    // 2. SSN
    const ssn = String(answers['debtor_ssn_last4'] ?? '').trim();
    if (ssn.length !== 4) {
        issues.push({
            id: 'debtor_ssn_invalid',
            fieldId: 'debtor_ssn_last4',
            label: 'SSN (Last 4)',
            message: 'Must be exactly 4 digits.',
            sectionId: 'identity',
            severity: 'critical',
        });
    }

    // 3. Address
    const address = String(answers['debtor_address'] ?? '').trim();
    const county = String(answers['county'] ?? '').trim();
    if (isEmpty(address)) {
        issues.push({
            id: 'debtor_address_missing',
            fieldId: 'debtor_address',
            label: 'Address',
            message: 'Residential address is required.',
            sectionId: 'contact',
            severity: 'critical',
        });
    }
    if (isEmpty(county)) {
        issues.push({
            id: 'debtor_county_missing',
            fieldId: 'county',
            label: 'County',
            message: 'County of residence is required.',
            sectionId: 'contact',
            severity: 'critical',
        });
    }

    // 4. Contact
    if (isEmpty(answers['debtor_phone'])) {
        issues.push({
            id: 'debtor_phone_missing',
            fieldId: 'debtor_phone',
            label: 'Phone Number',
            message: 'Phone number is required.',
            sectionId: 'contact',
            severity: 'warning',
        });
    }

    // --- Part 2: Spouse (if filing jointly) ---
    const filingSetup = String(answers['filing_setup'] ?? '').toLowerCase();
    const isJoint = filingSetup.includes('spouse');

    if (isJoint) {
        if (isEmpty(answers['spouse_full_name'])) {
            issues.push({
                id: 'spouse_name_missing',
                fieldId: 'spouse_full_name',
                label: 'Spouse Name',
                message: 'Spouse full name is missing.',
                sectionId: 'spouse',
                severity: 'critical',
            });
        }
        const spouseSsn = String(answers['spouse_ssn_last4'] ?? '').trim();
        if (spouseSsn.length !== 4) {
            issues.push({
                id: 'spouse_ssn_invalid',
                fieldId: 'spouse_ssn_last4',
                label: 'Spouse SSN',
                message: 'Spouse SSN must be 4 digits.',
                sectionId: 'spouse',
                severity: 'critical',
            });
        }
    }

    // --- Part 2: Bankruptcy Information ---

    // 9. Prior Bankruptcy
    const prior = String(answers['prior_bankruptcy'] ?? '').toLowerCase();
    if (prior === 'yes') {
        if (isEmpty(answers['prior_bankruptcy_district'])) {
            issues.push({
                id: 'prior_district_missing',
                fieldId: 'prior_bankruptcy_district',
                label: 'Prior Bankruptcy District',
                message: 'District is required if you filed before.',
                sectionId: 'contact',
                severity: 'critical',
            });
        }
        if (isEmpty(answers['prior_bankruptcy_date'])) {
            issues.push({
                id: 'prior_date_missing',
                fieldId: 'prior_bankruptcy_date',
                label: 'Prior Bankruptcy Date',
                message: 'Date of prior filing is required.',
                sectionId: 'contact',
                severity: 'critical',
            });
        }
        if (isEmpty(answers['prior_bankruptcy_case_number'])) {
            issues.push({
                id: 'prior_case_missing',
                fieldId: 'prior_bankruptcy_case_number',
                label: 'Prior Case Number',
                message: 'Case number is required.',
                sectionId: 'contact',
                severity: 'critical',
            });
        }
    }

    // 11. Rent / Eviction
    const realEstate = String(answers['real_estate_ownership'] ?? '').toLowerCase();
    const isRenting = realEstate.includes('do not own') || realEstate.includes('rent');
    if (isRenting) {
        // Check for eviction judgment
        // The form defaults to "No" in form101.ts line 483 if not present.
        // Ideally we want an explicit Yes/No from the user.
        // If we can't find an answer for eviction, we might warn.
        // However, the intake usually provides a default path.
    }

    // 15. Credit Counseling
    // Accept either explicit "yes" answer OR uploaded credit counseling documents
    const counseling = String(answers['debtor_counseling_complete'] ?? '').toLowerCase();
    const hasCounselingDocs = hasFiles('upload_debt_counseling');

    if (counseling !== 'yes' && !hasCounselingDocs) {
        issues.push({
            id: 'counseling_missing',
            fieldId: 'debtor_counseling_complete',
            label: 'Credit Counseling',
            message: 'Must complete credit counseling course.',
            sectionId: 'documents',
            severity: 'critical',
        });
    }

    if (isJoint) {
        const spouseCounseling = String(answers['spouse_counseling_complete'] ?? '').toLowerCase();
        // For spouse, we check if there are at least 2 files (both debtor and spouse certificates)
        const counselingFiles = uploadedFiles?.['upload_debt_counseling'] || [];
        const hasSpouseCounseling = counselingFiles.length >= 2;

        if (spouseCounseling !== 'yes' && !hasSpouseCounseling) {
            issues.push({
                id: 'spouse_counseling_missing',
                fieldId: 'spouse_counseling_complete',
                label: 'Spouse Counseling',
                message: 'Spouse must complete credit counseling.',
                sectionId: 'documents',
                severity: 'critical',
            });
        }
    }

    // 16. Debt Types (Consumer/Business)
    // Defaults to Consumer Yes / Business No in form101.ts.

    // 18-20. Financials
    // We check if creditors are listed.
    const unsecured = String(answers['unsecured_creditors'] ?? '');
    const secured = String(answers['other_secured_details'] ?? '');
    if (!unsecured && !secured) {
        issues.push({
            id: 'creditors_missing',
            fieldId: 'unsecured_creditors',
            label: 'Creditors',
            message: 'No creditors listed. Verify if this is accurate.',
            sectionId: 'unsecured',
            severity: 'warning',
        });
    }

    // NEW: Validate Questions 16-20 (Statistical fields)
    const debtNature = String(answers['debt_nature'] ?? '').trim();
    if (!debtNature) {
        issues.push({
            id: 'debt_nature_missing',
            fieldId: 'debt_nature',
            label: 'Nature of Debts (Q16)',
            message: 'Must specify whether debts are consumer, business, or both.',
            severity: 'critical',
        });
    }

    const assetDistribution = String(answers['asset_distribution_expected'] ?? '').trim();
    if (!assetDistribution) {
        issues.push({
            id: 'asset_distribution_missing',
            fieldId: 'asset_distribution_expected',
            label: 'Asset Distribution (Q17)',
            message: 'Must indicate if funds will be available for unsecured creditors.',
            severity: 'critical',
        });
    }

    const creditorCount = String(answers['creditor_count_range'] ?? '').trim();
    if (!creditorCount) {
        issues.push({
            id: 'creditor_count_missing',
            fieldId: 'creditor_count_range',
            label: 'Creditor Count (Q18)',
            message: 'Must estimate number of creditors.',
            severity: 'critical',
        });
    }

    const assetRange = String(answers['asset_range'] ?? '').trim();
    if (!assetRange) {
        issues.push({
            id: 'asset_range_missing',
            fieldId: 'asset_range',
            label: 'Asset Estimate (Q19)',
            message: 'Must estimate total assets.',
            severity: 'critical',
        });
    }

    const liabilityRange = String(answers['liability_range'] ?? '').trim();
    if (!liabilityRange) {
        issues.push({
            id: 'liability_range_missing',
            fieldId: 'liability_range',
            label: 'Liability Estimate (Q20)',
            message: 'Must estimate total liabilities.',
            severity: 'critical',
        });
    }

    // NEW: Validate filing fee method
    const filingFeeMethod = String(answers['filing_fee_method'] ?? '').trim();
    if (!filingFeeMethod) {
        issues.push({
            id: 'filing_fee_method_missing',
            fieldId: 'filing_fee_method',
            label: 'Filing Fee Method (Q8)',
            message: 'Must select how $338 filing fee will be paid.',
            severity: 'critical',
        });
    }

    return {
        ready: issues.filter(i => i.severity === 'critical').length === 0,
        issues,
    };
}
