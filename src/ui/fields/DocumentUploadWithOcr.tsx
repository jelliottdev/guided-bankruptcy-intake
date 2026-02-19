import React, { useState, useCallback } from 'react';
import { Stack, Alert, CircularProgress, Typography, Chip, Select, Option, Button } from '@mui/joy';
import { AutoAwesome, CloudOff, HelpOutline } from '@mui/icons-material';
import { useOcrExtractionWithOwnership } from '../../hooks/useOcrExtractionWithOwnership';
import type { OcrDocumentType } from '../../hooks/useOcrExtraction';
import type { OwnershipDetectionResult } from '../../ocr/ownershipDetection';
import { ExtractedDataReview } from './ExtractedDataReview';
import { upsertOcrResult } from '../../ocr/store';

// Supported file formats for OCR
const SUPPORTED_OCR_FORMATS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

export interface FileInputProps {
    type: 'file';
    id: string;
    multiple: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

export interface OcrState {
    extracting: boolean;
    serviceAvailable: boolean;
    error?: Error;
    result?: any;
    ownership?: OwnershipDetectionResult;
    needsClarification: boolean;
    showReview: boolean;
}

interface DocumentUploadWithOcrProps {
    fieldId: string;
    documentType: OcrDocumentType;
    caseAnswers: Record<string, unknown>;
    onUpload: (fileNames: string[]) => void; // Called after OCR processing completes
    onFilesSelected?: (files: File[]) => void;
    onExtractedData?: (data: Record<string, any>, confidence: number, ownership?: 'debtor' | 'spouse' | 'joint') => void;
    renderContent: (inputProps: FileInputProps, state: OcrState) => React.ReactNode;
    autoFill?: boolean;
    confidenceThreshold?: number;
}

/**
 * OCR-enhanced file upload wrapper using render props pattern.
 * 
 * This component:
 * 1. Owns the file input onChange handler (triggers OCR)
 * 2. Provides input props + OCR state to parent via renderContent callback
 * 3. Parent renders the surrounding UI using the OCR-enhanced input
 * 
 * This pattern ensures the wrapper has full control over file processing
 * while allowing the parent to customize the visual presentation.
 */
export function DocumentUploadWithOcr({
    fieldId,
    documentType,
    caseAnswers,
    onUpload,
    onFilesSelected,
    onExtractedData,
    renderContent,
    autoFill = false,
    confidenceThreshold = 0.75,
}: DocumentUploadWithOcrProps) {
    console.log('[DocumentUploadWithOcr] Mounted for field:', fieldId);

    const [showReview, setShowReview] = useState(false);
    const [needsClarification, setNeedsClarification] = useState(false);
    const [clarificationAnswer, setClarificationAnswer] = useState<'debtor' | 'spouse' | 'joint'>('debtor');
    const [pendingFileNames, setPendingFileNames] = useState<string[]>([]);

    const { extracting, result, ownership, error, serviceAvailable, isJoint, extract, reset } =
        useOcrExtractionWithOwnership({
            documentType,
            caseAnswers,
            uploadFieldId: fieldId,
            onSuccess: (ocrResult, ownershipData) => {
                console.log('[OCR] Extraction successful');
                console.log('[Ownership] Detected:', ownershipData.ownership, 'Confidence:', ownershipData.confidence);
                console.log('[Ownership] Signals:', ownershipData.signals);

                // Check if ownership detection needs client clarification
                if (ownershipData.requiresClientClarification) {
                    console.log('[Ownership] Client clarification required');
                    setNeedsClarification(true);
                    setShowReview(false);
                    return;
                }

                // Store ownership in OCR result if known
                if (ownershipData.ownership !== 'unknown') {
                    console.log(`[OCR] Storing ownership: ${ownershipData.ownership}`);
                    if (pendingFileNames.length > 0) {
                        upsertOcrResult({
                            fileId: pendingFileNames[0],
                            belongsTo: ownershipData.ownership,
                            status: 'done',
                        });
                    }
                }

                // Auto-fill if confidence is high enough and enabled
                if (autoFill && ocrResult.confidence >= confidenceThreshold) {
                    console.log('[OCR] Auto-filling data (high confidence)');
                    onExtractedData?.(
                        ocrResult.extracted_data,
                        ocrResult.confidence,
                        ownershipData.ownership !== 'unknown' ? ownershipData.ownership : undefined
                    );

                    // Upload files after OCR completes
                    if (pendingFileNames.length > 0) {
                        console.log('[Upload] Uploading files after OCR:', pendingFileNames);
                        onUpload(pendingFileNames);
                        setPendingFileNames([]);
                    }
                } else {
                    console.log('[OCR] Showing review UI (low confidence or manual mode)');
                    setShowReview(true);
                }
            },
            onError: (err) => {
                console.error('[OCR] Extraction failed:', err);
                // Upload anyway on error
                if (pendingFileNames.length > 0) {
                    console.warn('[Upload] Uploading files despite OCR error');
                    onUpload(pendingFileNames);
                    setPendingFileNames([]);
                }
            },
        });

    // File validation helper
    const validateFileType = (file: File): boolean => {
        const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
        const isSupported = ext ? SUPPORTED_OCR_FORMATS.includes(ext) : false;
        console.log(`[Upload] File type check: ${file.name} → ${ext} → ${isSupported ? '✓' : '✗'}`);
        return isSupported;
    };

    // Handle file selection from input
    const handleFileChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            console.log(`[Upload] ${files.length} file(s) selected for ${fieldId}`);

            const fileArray = Array.from(files);
            const fileNames = fileArray.map((f) => f.name);
            setPendingFileNames(fileNames);

            // Notify parent immediately about selected files (for persistence/blobs)
            onFilesSelected?.(fileArray);

            let processedAny = false;

            // Process each file through OCR if supported
            for (const file of fileArray) {
                console.log(`[Upload] Processing: ${file.name}`);

                // Check if OCR service is available
                if (!serviceAvailable) {
                    console.warn('[OCR] Service unavailable - skipping extraction');
                    continue;
                }

                // Validate file type
                if (!validateFileType(file)) {
                    console.warn(`[Upload] Unsupported file type: ${file.name} - uploading without OCR`);
                    continue;
                }

                try {
                    console.log(`[OCR] Starting extraction for: ${file.name}`);
                    await extract(file);
                    processedAny = true;
                } catch (err) {
                    console.error(`[OCR] Failed to process ${file.name}:`, err);
                }
            }

            // If no files were processed through OCR, upload immediately
            if (!processedAny) {
                console.log('[Upload] No files processed through OCR, uploading immediately');
                onUpload(fileNames);
                setPendingFileNames([]);
            }

            // Reset input value to allow re-uploading same file
            event.target.value = '';
        },
        [fieldId, serviceAvailable, extract, onUpload]
    );

    const handleAccept = useCallback(() => {
        if (result && ownership) {
            console.log('[Review] User accepted extracted data');
            onExtractedData?.(
                result.extracted_data,
                result.confidence,
                ownership.ownership !== 'unknown' ? ownership.ownership : undefined
            );

            // Upload files after review accepted
            if (pendingFileNames.length > 0) {
                onUpload(pendingFileNames);
                setPendingFileNames([]);
            }

            setShowReview(false);
            reset();
        }
    }, [result, ownership, onExtractedData, onUpload, pendingFileNames, reset]);

    const handleReject = useCallback(() => {
        console.log('[Review] User rejected extracted data');

        // Upload files anyway (user will manually enter data)
        if (pendingFileNames.length > 0) {
            onUpload(pendingFileNames);
            setPendingFileNames([]);
        }

        setShowReview(false);
        reset();
    }, [onUpload, pendingFileNames, reset]);

    const handleClarificationSubmit = useCallback(() => {
        if (!result) return;

        console.log('[Clarification] User selected ownership:', clarificationAnswer);

        // Update OCR result with user-confirmed ownership
        if (pendingFileNames.length > 0) {
            upsertOcrResult({
                fileId: pendingFileNames[0],
                belongsTo: clarificationAnswer,
                status: 'done',
            });
        }

        // Apply data to form with confirmed ownership
        onExtractedData?.(result.extracted_data, result.confidence, clarificationAnswer);

        // Upload files after clarification
        if (pendingFileNames.length > 0) {
            onUpload(pendingFileNames);
            setPendingFileNames([]);
        }

        setNeedsClarification(false);
        reset();
    }, [result, clarificationAnswer, onExtractedData, onUpload, pendingFileNames, reset]);

    const debtorName = String(caseAnswers.debtor_full_name || 'Debtor');
    const spouseName = String(caseAnswers.spouse_full_name || 'Spouse');

    // Prepare input props to pass to render callback
    const inputProps: FileInputProps = {
        type: 'file',
        id: fieldId,
        multiple: true,
        onChange: handleFileChange,
        disabled: extracting,
    };

    // Prepare OCR state to pass to render callback
    const ocrState: OcrState = {
        extracting,
        serviceAvailable,
        error: error || undefined,
        result,
        ownership: ownership || undefined,
        needsClarification,
        showReview,
    };

    return (
        <Stack spacing={2}>
            {/* Service unavailable warning */}
            {!serviceAvailable && (
                <Alert color="warning" variant="soft" size="sm" startDecorator={<CloudOff />}>
                    <Typography level="body-sm">
                        Smart extraction temporarily unavailable - files will upload without automatic data extraction
                    </Typography>
                </Alert>
            )}

            {/* Parent-rendered content (includes the file input) */}
            {renderContent(inputProps, ocrState)}

            {/* Extracting indicator */}
            {extracting && (
                <Alert color="primary" variant="soft" startDecorator={<CircularProgress size="sm" />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AutoAwesome sx={{ fontSize: 18 }} />
                        <Typography level="body-sm">Extracting data and detecting ownership...</Typography>
                    </Stack>
                </Alert>
            )}

            {/* Error state */}
            {error && (
                <Alert color="danger" variant="soft" size="sm">
                    <Typography level="body-sm">Could not extract data: {error.message}</Typography>
                </Alert>
            )}

            {/* Client Clarification UI (shown when ownership uncertain) */}
            {needsClarification && result && (
                <Alert color="warning" variant="soft" startDecorator={<HelpOutline />}>
                    <Stack spacing={2}>
                        <Typography level="title-sm">Whose document is this?</Typography>
                        <Typography level="body-sm">
                            We couldn't automatically determine who this document belongs to. Please select the correct
                            owner:
                        </Typography>

                        <Select
                            value={clarificationAnswer}
                            onChange={(_, value) => value && setClarificationAnswer(value)}
                            size="sm"
                        >
                            <Option value="debtor">{debtorName} only</Option>
                            {isJoint && <Option value="spouse">{spouseName} only</Option>}
                            {isJoint && <Option value="joint">Both (Joint)</Option>}
                        </Select>

                        <Button onClick={handleClarificationSubmit} size="sm" color="warning">
                            Confirm and Apply Data
                        </Button>
                    </Stack>
                </Alert>
            )}

            {/* Review extracted data */}
            {showReview && result && (
                <ExtractedDataReview
                    data={result.extracted_data}
                    confidence={result.confidence}
                    warnings={result.warnings}
                    documentType={documentType}
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}

            {/* Success indicator after auto-fill with ownership info */}
            {!showReview && !needsClarification && result && ownership && result.confidence >= confidenceThreshold && (
                <Alert color="success" variant="soft" size="sm">
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AutoAwesome sx={{ fontSize: 16 }} />
                            <Typography level="body-sm">
                                Data extracted and assigned to{' '}
                                <strong>
                                    {ownership.ownership === 'debtor' && debtorName}
                                    {ownership.ownership === 'spouse' && spouseName}
                                    {ownership.ownership === 'joint' && 'both'}
                                </strong>
                            </Typography>
                            <Chip size="sm" variant="soft" color="success">
                                {Math.round(result.confidence * 100)}% confident
                            </Chip>
                        </Stack>

                        {/* Show detection reasoning */}
                        {ownership.signals.length > 0 && (
                            <Typography level="body-xs" sx={{ opacity: 0.7 }}>
                                Detected from:{' '}
                                {ownership.signals
                                    .slice(0, 2)
                                    .map((s: any) => s.source)
                                    .join(', ')}
                            </Typography>
                        )}
                    </Stack>
                </Alert>
            )}
        </Stack>
    );
}
