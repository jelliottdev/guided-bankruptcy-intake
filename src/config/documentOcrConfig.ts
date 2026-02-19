/**
 * Document Upload OCR Configuration
 * 
 * Maps document upload fields to OCR document types and field extraction mappings.
 * Used to enable intelligent data extraction from uploaded documents.
 */

export type OcrDocumentType = 'paystub' | 'bank_statement' | 'tax_return' | 'generic';

export interface DocumentOcrConfig {
    fieldId: string;
    documentType: OcrDocumentType;
    autoExtract: boolean;
    confidenceThreshold: number;
    fieldMappings: Record<string, string>; // OCR field → form field
}

/**
 * Configuration for which upload fields should use OCR extraction
 */
export const DOCUMENT_OCR_CONFIGS: Record<string, DocumentOcrConfig> = {
    // Paystub uploads
    upload_paystubs: {
        fieldId: 'upload_paystubs',
        documentType: 'paystub',
        autoExtract: true,
        confidenceThreshold: 0.75,
        fieldMappings: {
            employer: 'debtor_employer',
            gross_pay: 'income_employment', // Monthly gross income
            net_pay: 'disposable_income', // Monthly net/take-home
            ytd_gross: 'ytd_gross_income',
            pay_period_start: 'last_paystub_period_start',
            pay_period_end: 'last_paystub_period_end',
        },
    },

    // Bank statement uploads
    upload_bank_statements: {
        fieldId: 'upload_bank_statements',
        documentType: 'bank_statement',
        autoExtract: true,
        confidenceThreshold: 0.70,
        fieldMappings: {
            account_number: 'bank_account_number',
            ending_balance: 'bank_account_balance',
        },
    },

    // Tax return uploads
    upload_tax_returns: {
        fieldId: 'upload_tax_returns',
        documentType: 'tax_return',
        autoExtract: true,
        confidenceThreshold: 0.80,
        fieldMappings: {
            agi: 'adjusted_gross_income',
            tax_year: 'last_tax_year_filed',
        },
    },

    // --- Dynamic Asset Uploads (Items 1-3) ---

    // Property 1
    property_1_doc: {
        fieldId: 'property_1_doc',
        documentType: 'generic', // Mortgage statement
        autoExtract: true,
        confidenceThreshold: 0.70,
        fieldMappings: {
            propertyAddress: 'property_1_address',
            outstandingBalance: 'property_1_mortgage_balance',
            lenderName: 'property_1_mortgage_details',
            // ownerName used for ownership detection logic, not direct mapping usually
        }
    },
    // Vehicle 1
    vehicle_1_doc: {
        fieldId: 'vehicle_1_doc',
        documentType: 'generic', // Title/Reg
        autoExtract: true,
        confidenceThreshold: 0.70,
        fieldMappings: {
            make: 'vehicle_1_make',
            model: 'vehicle_1_model',
            year: 'vehicle_1_year',
            vin: 'vehicle_1_vin',
        }
    },
    // Account 1
    account_1_doc: {
        fieldId: 'account_1_doc',
        documentType: 'bank_statement',
        autoExtract: true,
        confidenceThreshold: 0.70,
        fieldMappings: {
            bankName: 'account_1_institution',
            accountNumber: 'account_1_last4',
            ending_balance: 'account_1_balance',
        }
    },

    // (Ideally we'd generate these programmatically, but static for now for safety)
    property_2_doc: { fieldId: 'property_2_doc', documentType: 'generic', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { propertyAddress: 'property_2_address', outstandingBalance: 'property_2_mortgage_balance', lenderName: 'property_2_mortgage_details' } },
    property_3_doc: { fieldId: 'property_3_doc', documentType: 'generic', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { propertyAddress: 'property_3_address', outstandingBalance: 'property_3_mortgage_balance', lenderName: 'property_3_mortgage_details' } },

    vehicle_2_doc: { fieldId: 'vehicle_2_doc', documentType: 'generic', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { make: 'vehicle_2_make', model: 'vehicle_2_model', year: 'vehicle_2_year', vin: 'vehicle_2_vin' } },
    vehicle_3_doc: { fieldId: 'vehicle_3_doc', documentType: 'generic', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { make: 'vehicle_3_make', model: 'vehicle_3_model', year: 'vehicle_3_year', vin: 'vehicle_3_vin' } },

    account_2_doc: { fieldId: 'account_2_doc', documentType: 'bank_statement', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { bankName: 'account_2_institution', accountNumber: 'account_2_last4', ending_balance: 'account_2_balance' } },
    account_3_doc: { fieldId: 'account_3_doc', documentType: 'bank_statement', autoExtract: true, confidenceThreshold: 0.70, fieldMappings: { bankName: 'account_3_institution', accountNumber: 'account_3_last4', ending_balance: 'account_3_balance' } },
};

/**
 * Check if a field ID should use OCR extraction
 */
export function shouldUseOcr(fieldId: string): boolean {
    return fieldId in DOCUMENT_OCR_CONFIGS;
}

/**
 * Get OCR configuration for a field
 */
export function getOcrConfig(fieldId: string): DocumentOcrConfig | null {
    return DOCUMENT_OCR_CONFIGS[fieldId] || null;
}
