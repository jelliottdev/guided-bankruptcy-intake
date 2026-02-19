import { OcrResult } from './ocr';

export const MOCK_OCR_RESPONSES: Record<string, Partial<OcrResult>> = {
    paystub_debtor: {
        document_type: 'paystub',
        confidence: 0.98,
        extracted_data: {
            employeeName: 'Nick Jensen',
            employer: 'Tech Corp Inc',
            gross_pay: 5000.00,
            net_pay: 4000.00,
            pay_period_start: '2025-10-01',
            pay_period_end: '2025-10-15',
        },
        raw_ocr: [
            { text: 'Nick Jensen', confidence: 0.99, bbox: [] },
            { text: 'Tech Corp Inc', confidence: 0.98, bbox: [] },
            { text: 'Net Pay: $4,000.00', confidence: 0.95, bbox: [] }
        ],
        suggestions: [],
        warnings: []
    },
    paystub_spouse: {
        document_type: 'paystub',
        confidence: 0.97,
        extracted_data: {
            employeeName: 'Katie Jensen',
            employer: 'Hospital System',
            gross_pay: 6000.00,
            net_pay: 4500.00,
        },
        raw_ocr: [
            { text: 'Katie Jensen', confidence: 0.99, bbox: [] },
            { text: 'Hospital System', confidence: 0.98, bbox: [] }
        ],
        suggestions: [],
        warnings: []
    },
    bank_statement_joint: {
        document_type: 'bank_statement',
        confidence: 0.95,
        extracted_data: {
            accountHolderName: 'Nick Jensen and Katie Jensen',
            bankName: 'Chase',
            accountNumber: '1234567890',
            ending_balance: 1500.50,
        },
        raw_ocr: [
            { text: 'Nick Jensen', confidence: 0.99, bbox: [] },
            { text: 'Katie Jensen', confidence: 0.99, bbox: [] },
            { text: 'Joint Account', confidence: 0.90, bbox: [] }
        ],
        suggestions: [],
        warnings: []
    },
    ambiguous_doc: {
        document_type: 'generic',
        confidence: 0.60, // Low confidence to trigger clarification potentially
        extracted_data: {
            // No clear name
        },
        raw_ocr: [
            { text: 'Invoice #12345', confidence: 0.90, bbox: [] },
            { text: 'Total Due: $500', confidence: 0.95, bbox: [] }
        ],
        suggestions: [],
        warnings: ['Could not detect owner name']
    },
    vehicle_title_toyota: {
        document_type: 'vehicle_title',
        confidence: 0.95,
        extracted_data: {
            make: 'Toyota',
            model: 'Camry',
            year: '2018',
            vin: '4T1BF1FK0JU123456',
            ownerName: 'Nick Jensen',
        },
        raw_ocr: [],
        suggestions: [],
        warnings: []
    },
    mortgage_statement: {
        document_type: 'mortgage_statement',
        confidence: 0.92,
        extracted_data: {
            lenderName: 'Wells Fargo Home Mortgage',
            accountNumber: '1234-5678-9012',
            outstandingBalance: 185400.00,
            propertyAddress: '123 Maple St, Springfield, IL 62704',
            ownerName: 'Nick Jensen and Katie Jensen',
        },
        raw_ocr: [],
        suggestions: [],
        warnings: []
    }
};

export function getMockResponse(fileName: string, type: string): OcrResult {
    const lowerName = fileName.toLowerCase();
    let mockKey = 'ambiguous_doc';

    if (lowerName.includes('nick') && lowerName.includes('paystub')) {
        mockKey = 'paystub_debtor';
    } else if (lowerName.includes('katie') && lowerName.includes('paystub')) {
        mockKey = 'paystub_spouse';
    } else if (lowerName.includes('joint') && lowerName.includes('bank')) {
        mockKey = 'bank_statement_joint';
    } else if (lowerName.includes('toyota') || lowerName.includes('title')) {
        mockKey = 'vehicle_title_toyota';
    } else if (lowerName.includes('mortgage') || lowerName.includes('wells')) {
        mockKey = 'mortgage_statement';
    }

    // Return deep copy to simplify
    const mock = MOCK_OCR_RESPONSES[mockKey] || MOCK_OCR_RESPONSES.ambiguous_doc;

    return {
        extracted_data: {},
        confidence: 0,
        raw_ocr: [],
        suggestions: [],
        warnings: [],
        document_type: type,
        ...mock
    };
}
