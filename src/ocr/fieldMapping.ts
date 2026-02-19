import type { OcrDocType } from './types';

/**
 * Maps OCR-extracted field names to intake form field IDs.
 * Supports conditional mapping based on document ownership (debtor/spouse/joint).
 *
 * CRITICAL: These field IDs MUST match the actual field IDs defined in form/steps/allSteps.ts
 *
 * Schedule A/B: bank_statement and tax_return mappings below feed mapAssetsToScheduleB
 * (account balance, tax refunds). See docs/FORM_TO_INTAKE_MATRIX.md and docs/OCR_PLEADINGS.md.
 */
type FieldMapping = string | { debtor: string; spouse: string };

export const OCR_FIELD_MAPPING: Record<OcrDocType, Record<string, FieldMapping>> = {
    paystub: {
        grossPay: { debtor: 'debtor_gross_pay', spouse: 'spouse_gross_pay' },
        netPay: { debtor: 'debtor_gross_pay', spouse: 'spouse_gross_pay' }, // Map to gross (closest match)
        ytdGross: 'income_current_ytd',         // Year-to-date (shared field)
        employerName: { debtor: 'debtor_employer', spouse: 'spouse_employer' },
    },
    bank_statement: {
        endingBalance: 'account_balance',       // → Schedule B financial accounts (shared)
        statementPeriod: 'bank_statement_period', // Statement date range (shared)
    },
    tax_return: {
        agi: 'income_last_year',                // Adjusted gross income (shared)
        expectedRefund: 'tax_refunds_details',  // → Schedule B tax refunds (append or overwrite per policy)
        refundAmount: 'tax_refunds_details',    // → Schedule B tax refunds (alternate extractor key)
    },
    credit_counseling: {
        completionDate: 'debtor_counseling_date', // Completion date (shared)
    },
    unknown: {},
};

/**
 * Given an OCR field name, document type, and ownership, return the corresponding intake field ID.
 */
export function getIntakeFieldId(
    docType: OcrDocType,
    ocrFieldName: string,
    belongsTo: 'debtor' | 'spouse' | 'joint' = 'debtor'
): string | null {
    const mapping = OCR_FIELD_MAPPING[docType]?.[ocrFieldName];
    if (!mapping) return null;

    // If mapping is a string, return it directly (shared field)
    if (typeof mapping === 'string') return mapping;

    // If mapping is conditional, resolve based on belongsTo
    // For 'joint' documents, default to debtor field
    return belongsTo === 'spouse' ? mapping.spouse : mapping.debtor;
}

/**
 * Get all mappable fields from OCR extraction results.
 */
export function getMappableFields(
    docType: OcrDocType,
    extractedFields: Record<string, { value: string | number; confidence: number }>,
    belongsTo: 'debtor' | 'spouse' | 'joint' = 'debtor'
): Array<{ ocrField: string; intakeFieldId: string; value: string | number; confidence: number }> {
    const result: Array<{ ocrField: string; intakeFieldId: string; value: string | number; confidence: number }> = [];

    for (const [ocrField, fieldData] of Object.entries(extractedFields)) {
        const intakeFieldId = getIntakeFieldId(docType, ocrField, belongsTo);
        if (intakeFieldId) {
            result.push({
                ocrField,
                intakeFieldId,
                value: fieldData.value,
                confidence: fieldData.confidence,
            });
        }
    }

    return result;
}
