/**
 * Required field validation rules for Form 101
 */

import type { Answers } from '../../../form/types';
import type { ValidationIssue } from '../ValidationEngine';

/**
 * Validate Questions 16-20 (Statistical/Estimate fields)
 */
export function validateStatisticalFields(answers: Answers): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Question 16: Nature of Debts
    const debtNature = String(answers['debt_nature'] ?? '').trim();
    if (!debtNature) {
        issues.push({
            id: 'debt_nature_missing',
            severity: 'blocker',
            category: 'required_field',
            title: 'Question 16: Nature of Debts Missing',
            message: 'Must specify whether debts are primarily consumer, business, or both.',
            formQuestion: 'Question 16',
            fieldIds: ['debt_nature'],
            legalRequirement: 'Required for Means Test determination (11 U.S.C. § 707(b))',
            resolution: 'Select Consumer, Business, or Both in the Final Review section',
        });
    }

    // Question 17: Expected Asset Distribution
    const assetDistribution = String(answers['asset_distribution_expected'] ?? '').trim();
    if (!assetDistribution) {
        issues.push({
            id: 'asset_distribution_missing',
            severity: 'critical',
            category: 'required_field',
            title: 'Question 17: Asset Distribution Missing',
            message: 'Must indicate whether funds will be available to distribute to unsecured creditors.',
            formQuestion: 'Question 17',
            fieldIds: ['asset_distribution_expected'],
            resolution: 'Answer Yes or No in the Final Review section',
        });
    }

    // Question 18: Estimated number of creditors
    const creditorCount = String(answers['creditor_count_range'] ?? '').trim();
    if (!creditorCount) {
        issues.push({
            id: 'creditor_count_missing',
            severity: 'blocker',
            category: 'required_field',
            title: 'Question 18: Creditor Count Missing',
            message: 'Must estimate the number of creditors.',
            formQuestion: 'Question 18',
            fieldIds: ['creditor_count_range'],
            legalRequirement: 'Required for statistical reporting to U.S. Trustee',
            resolution: 'Select creditor count range in the Final Review section',
        });
    }

    // Question 19: Estimated assets
    const assetRange = String(answers['asset_range'] ?? '').trim();
    if (!assetRange) {
        issues.push({
            id: 'asset_range_missing',
            severity: 'blocker',
            category: 'required_field',
            title: 'Question 19: Asset Estimate Missing',
            message: 'Must estimate total value of assets.',
            formQuestion: 'Question 19',
            fieldIds: ['asset_range'],
            legalRequirement: 'Required for statistical reporting and fee determination',
            resolution: 'Select asset range in the Final Review section',
        });
    }

    // Question 20: Estimated liabilities
    const liabilityRange = String(answers['liability_range'] ?? '').trim();
    if (!liabilityRange) {
        issues.push({
            id: 'liability_range_missing',
            severity: 'blocker',
            category: 'required_field',
            title: 'Question 20: Liability Estimate Missing',
            message: 'Must estimate total amount of debts.',
            formQuestion: 'Question 20',
            fieldIds: ['liability_range'],
            legalRequirement: 'Required for statistical reporting',
            resolution: 'Select liability range in the Final Review section',
        });
    }

    return issues;
}

/**
 * Validate Filing Fee Method (Question 8)
 */
export function validateFilingFee(answers: Answers): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const filingFeeMethod = String(answers['filing_fee_method'] ?? '').trim();
    if (!filingFeeMethod) {
        issues.push({
            id: 'filing_fee_method_missing',
            severity: 'blocker',
            category: 'required_field',
            title: 'Question 8: Filing Fee Payment Method Missing',
            message: 'Must select how the $338 filing fee will be paid.',
            formQuestion: 'Question 8',
            fieldIds: ['filing_fee_method'],
            legalRequirement: '28 U.S.C. § 1930(a) - Filing fee required',
            resolution: 'Select Full Payment, Installment Plan, or Fee Waiver in Filing Settings',
        });
    }

    // If fee waiver selected, income must be below threshold (validate later in cross-field rules)
    if (filingFeeMethod === 'fee_waiver') {
        // This will be validated in cross-field rules section
    }

    return issues;
}

/**
 * Validate SSN/EIN completeness
 * Note: We only validate that SSN is available for filing, not its actual value
 */
export function validateSSN(answers: Answers): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const isJoint = String(answers['filing_setup'] ?? '').includes('spouse');

    // Check debtor SSN
    const debtorSSN = String(answers['debtor_ssn_last4'] ?? '').trim();
    if (!debtorSSN || debtorSSN.length !== 4) {
        issues.push({
            id: 'debtor_ssn_missing',
            severity: 'critical',
            category: 'required_field',
            title: 'Debtor SSN Incomplete',
            message: 'Full Social Security Number required for court filing (shown as last 4 on public forms).',
            fieldIds: ['debtor_ssn_last4'],
            legalRequirement: 'Bankruptcy Rule 1007(f) - Statement of Social Security Number',
            resolution: 'Enter complete SSN in Identity section',
        });
    }

    // Check spouse SSN if joint filing
    if (isJoint) {
        const spouseSSN = String(answers['spouse_ssn_last4'] ?? '').trim();
        if (!spouseSSN || spouseSSN.length !== 4) {
            issues.push({
                id: 'spouse_ssn_missing',
                severity: 'critical',
                category: 'required_field',
                title: 'Spouse SSN Incomplete',
                message: 'Spouse Social Security Number required for joint filing.',
                fieldIds: ['spouse_ssn_last4'],
                legalRequirement: 'Bankruptcy Rule 1007(f)',
                resolution: 'Enter spouse SSN in Spouse Information section',
            });
        }
    }

    return issues;
}
