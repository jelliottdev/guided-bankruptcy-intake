/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * OCR Integration with Automatic Ownership Detection
 * 
 * This module integrates the OCR API responses with automatic ownership detection
 * for bankruptcy joint filings.
 */

import { extractDocumentData, type OcrResult as ApiOcrResult } from '../api/ocr';
import { detectDocumentOwner, formatDetectionResult, type DocumentOwnership, type OwnershipDetectionResult } from './ownershipDetection';
import type { OcrResult } from './types';

type CaseAnswers = Record<string, unknown>;

export type OcrExtractionOptions = {
    file: File;
    documentType: 'paystub' | 'bank_statement' | 'tax_return' | 'generic';
    caseAnswers: CaseAnswers;
    uploadFieldId?: string;
};

export type OcrExtractionWithOwnership = {
    ocrData: ApiOcrResult;
    ownership: OwnershipDetectionResult;
};

/**
 * Extract OCR data and automatically detect document ownership
 */
export async function extractWithOwnership(
    options: OcrExtractionOptions
): Promise<OcrExtractionWithOwnership> {
    const { file, documentType, caseAnswers, uploadFieldId } = options;

    // Step 1: Extract data using OCR API
    const ocrData = await extractDocumentData(file, documentType);

    // Step 2: Build case context for ownership detection
    const caseContext = {
        debtorFullName: String(caseAnswers.debtor_full_name || ''),
        spouseFullName: String(caseAnswers.spouse_full_name || ''),
        debtorFirstName: String(caseAnswers.debtor_full_name || '').split(' ')[0],
        spouseFirstName: String(caseAnswers.spouse_full_name || '').split(' ')[0],
    };

    // Step 3: Extract OCR content for ownership detection
    const ocrContent = {
        accountHolderName: (ocrData.extracted_data as any).accountHolderName,
        employeeName: (ocrData.extracted_data as any).employeeName,
        rawText: ocrData.raw_ocr.map(block => block.text).join(' '),
    };

    // Step 4: Detect ownership
    const ownership = detectDocumentOwner(
        file.name,
        ocrContent,
        caseContext,
        uploadFieldId
    );

    // Log detection result
    console.log('[OCR Ownership Detection]');
    console.log(formatDetectionResult(ownership));

    return {
        ocrData,
        ownership,
    };
}

/**
 * Helper to check if filing is joint (has spouse)
 */
export function isJointFiling(answers: CaseAnswers): boolean {
    return Boolean(answers.spouse_full_name);
}

/**
 * Convert API OCR result to internal OcrResult type with ownership
 */
export function apiResultToOcrResult(
    fileId: string,
    assignmentId: string,
    nodeId: string,
    fileName: string,
    apiResult: ApiOcrResult,
    ownership: DocumentOwnership,
    ownershipConfidence: number
): Partial<OcrResult> {
    const extracted = apiResult.extracted_data;

    return {
        fileId,
        assignmentId,
        nodeId,
        name: fileName,
        status: 'done',
        processedAt: new Date().toISOString(),
        belongsTo: ownership === 'unknown' ? undefined : ownership,
        ocrConfidence: apiResult.confidence,
        docType: apiResult.document_type as any,
        extracted: {
            docType: apiResult.document_type as any,
            fields: Object.entries(extracted).reduce((acc, [key, value]) => {
                acc[key] = {
                    value,
                    confidence: apiResult.confidence,
                    source: 'ocr',
                };
                return acc;
            }, {} as Record<string, { value: any; confidence: number; source: 'ocr' }>),
        },
    };
}
