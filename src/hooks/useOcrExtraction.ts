import { useState, useCallback } from 'react';
import { extractDocumentData, checkOcrServiceHealth, type OcrResult } from '@/api/ocr';

export type OcrDocumentType = 'paystub' | 'bank_statement' | 'tax_return' | 'generic';

export interface UseOcrExtractionOptions {
    documentType: OcrDocumentType;
    onSuccess?: (result: OcrResult) => void;
    onError?: (error: Error) => void;
    autoExtract?: boolean;
}

export interface UseOcrExtractionResult {
    extracting: boolean;
    result: OcrResult | null;
    error: Error | null;
    serviceAvailable: boolean;
    extract: (file: File) => Promise<void>;
    reset: () => void;
}

/**
 * Hook for OCR extraction with loading/error states
 */
export function useOcrExtraction(options: UseOcrExtractionOptions): UseOcrExtractionResult {
    const { documentType, onSuccess, onError } = options;

    const [extracting, setExtracting] = useState(false);
    const [result, setResult] = useState<OcrResult | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [serviceAvailable, setServiceAvailable] = useState(true);

    // Check service health on mount
    useState(() => {
        checkOcrServiceHealth().then(setServiceAvailable);
    });

    const extract = useCallback(async (file: File) => {
        setExtracting(true);
        setError(null);
        setResult(null);

        try {
            const extractedData = await extractDocumentData(file, documentType);
            setResult(extractedData);
            onSuccess?.(extractedData);
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('OCR extraction failed');
            setError(errorObj);
            onError?.(errorObj);
        } finally {
            setExtracting(false);
        }
    }, [documentType, onSuccess, onError]);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return {
        extracting,
        result,
        error,
        serviceAvailable,
        extract,
        reset,
    };
}
