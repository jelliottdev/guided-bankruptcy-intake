/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useCallback } from 'react';
import { checkOcrServiceHealth } from '../api/ocr';
import { extractWithOwnership, isJointFiling, type OcrExtractionOptions } from '../ocr/ocrWithOwnership';
import type { OwnershipDetectionResult } from '../ocr/ownershipDetection';
import type { OcrResult as ApiOcrResult } from '../api/ocr';

export type OcrDocumentType = 'paystub' | 'bank_statement' | 'tax_return' | 'generic';

export interface UseOcrExtractionWithOwnershipOptions {
    documentType: OcrDocumentType;
    caseAnswers: Record<string, unknown>;
    uploadFieldId?: string;
    onSuccess?: (result: ApiOcrResult, ownership: OwnershipDetectionResult) => void;
    onError?: (error: Error) => void;
}

export interface UseOcrExtractionWithOwnershipResult {
    extracting: boolean;
    result: ApiOcrResult | null;
    ownership: OwnershipDetectionResult | null;
    error: Error | null;
    serviceAvailable: boolean;
    isJoint: boolean;
    extract: (file: File) => Promise<void>;
    reset: () => void;
}

/**
 * Enhanced OCR extraction hook with automatic document ownership detection
 * 
 * This hook combines OCR extraction with intelligent ownership classification
 * for joint bankruptcy filings. It automatically determines whether a document
 * belongs to the debtor, spouse, or both using multi-signal heuristics.
 *  * Usage:
 * ```tsx
 * const { extract, ownership, result } = useOcrExtractionWithOwnership({
 *   documentType: 'paystub',
 *   caseAnswers: answers,
 *   uploadFieldId: 'paystubs',
 *   onSuccess: (ocrData, ownershipData) => {
 *     if (ownershipData.requiresClientClarification) {
 *       // Ask client to clarify ownership
 *     } else {
 *       // Auto-route based on ownership.ownership
 *     }
 *   }
 * });
 * ```
 */
export function useOcrExtractionWithOwnership(
    options: UseOcrExtractionWithOwnershipOptions
): UseOcrExtractionWithOwnershipResult {
    const { documentType, caseAnswers, uploadFieldId, onSuccess, onError } = options;

    const [extracting, setExtracting] = useState(false);
    const [result, setResult] = useState<ApiOcrResult | null>(null);
    const [ownership, setOwnership] = useState<OwnershipDetectionResult | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [serviceAvailable, setServiceAvailable] = useState(true);

    // Check if this is a joint filing
    const isJoint = isJointFiling(caseAnswers);

    // Check service health on mount
    useState(() => {
        checkOcrServiceHealth().then(setServiceAvailable);
    });

    const extract = useCallback(
        async (file: File) => {
            setExtracting(true);
            setError(null);
            setResult(null);
            setOwnership(null);

            try {
                // Extract OCR data + automatic ownership detection
                const { ocrData, ownership: ownershipResult } = await extractWithOwnership({
                    file,
                    documentType,
                    caseAnswers,
                    uploadFieldId,
                });

                setResult(ocrData);
                setOwnership(ownershipResult);
                onSuccess?.(ocrData, ownershipResult);
            } catch (err) {
                const errorObj = err instanceof Error ? err : new Error('OCR extraction failed');
                setError(errorObj);
                onError?.(errorObj);
            } finally {
                setExtracting(false);
            }
        },
        [documentType, caseAnswers, uploadFieldId, onSuccess, onError]
    );

    const reset = useCallback(() => {
        setResult(null);
        setOwnership(null);
        setError(null);
    }, []);

    return {
        extracting,
        result,
        ownership,
        error,
        serviceAvailable,
        isJoint,
        extract,
        reset,
    };
}
