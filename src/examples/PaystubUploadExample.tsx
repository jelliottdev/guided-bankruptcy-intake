/**
 * Example: OCR Upload with Automatic Ownership Detection
 * 
 * This example demonstrates how to integrate the enhanced OCR system
 * with automatic document ownership detection into a document upload field.
 */

import { useState } from 'react';
import { Stack, Button, Alert, Typography, Select, Option } from '@mui/joy';
import { useOcrExtractionWithOwnership } from '@/hooks/useOcrExtractionWithOwnership';
import { upsertOcrResult } from '@/ocr/store';
import type { UseIntakeState } from '@/hooks/useIntake';

interface PaystubUploadExampleProps {
    /** Current intake form answers (includes debtor/spouse names) */
    answers: Record<string, unknown>;
    /** Callback to update form field values */
    onFieldUpdate: (fieldId: string, value: any) => void;
    /** Current file upload state */
    fileId: string;
}

/**
 * Example paystub upload component with automatic ownership detection
 */
export function PaystubUploadExample({ answers, onFieldUpdate, fileId }: PaystubUploadExampleProps) {
    const [needsClarification, setNeedsClarification] = useState(false);
    const [clarificationAnswer, setClarificationAnswer] = useState<'debtor' | 'spouse' | 'joint'>('debtor');

    const { extracting, result, ownership, error, isJoint, extract } = useOcrExtractionWithOwnership({
        documentType: 'paystub',
        caseAnswers: answers,
        uploadFieldId: 'paystubs',
        onSuccess: (ocrData, ownershipData) => {
            console.log('[OCR Success]');
            console.log('Ownership:', ownershipData.ownership);
            console.log('Confidence:', ownershipData.confidence);
            console.log('Signals:', ownershipData.signals);

            if (ownershipData.requiresClientClarification) {
                // Low confidence - ask client
                setNeedsClarification(true);
            } else {
                // High confidence - auto-route
                applyOcrDataToForm(ocrData, ownershipData.ownership);
            }
        },
    });

    const handleFileUpload = async (file: File) => {
        await extract(file);
    };

    const handleClarificationSubmit = () => {
        if (!result || !ownership) return;

        // User has clarified ownership
        const finalOwnership = clarificationAnswer;

        // Update OCR result with user-confirmed ownership
        upsertOcrResult({
            fileId,
            belongsTo: finalOwnership,
            status: 'done',
        });

        // Apply data to form
        applyOcrDataToForm(result, finalOwnership);

        setNeedsClarification(false);
    };

    const applyOcrDataToForm = (
        ocrData: typeof result,
        documentOwnership: 'debtor' | 'spouse' | 'joint'
    ) => {
        if (!ocrData) return;

        const extracted = ocrData.extracted_data;

        // Route to appropriate fields based on ownership
        if (documentOwnership === 'debtor') {
            onFieldUpdate('debtor_employer', extracted.employer);
            onFieldUpdate('debtor_gross_pay', extracted.gross_pay || extracted.grossPay);
            onFieldUpdate('income_current_ytd', extracted.ytd_gross || extracted.ytdGross);
        } else if (documentOwnership === 'spouse') {
            onFieldUpdate('spouse_employer', extracted.employer);
            onFieldUpdate('spouse_gross_pay', extracted.gross_pay || extracted.grossPay);
        } else {
            // Joint - data is for both
            // (This is rare for paystubs but common for bank accounts)
        }

        // Store OCR result
        upsertOcrResult({
            fileId,
            belongsTo: documentOwnership,
            status: 'done',
            extracted: {
                docType: 'paystub',
                fields: Object.entries(extracted).reduce((acc, [key, value]) => {
                    acc[key] = {
                        value,
                        confidence: ocrData.confidence,
                        source: 'ocr',
                    };
                    return acc;
                }, {} as Record<string, any>),
            },
        });
    };

    return (
        <Stack spacing={2}>
            {/* File upload button */}
            <Button component="label">
                Upload Paystub
                <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                    }}
                />
            </Button>

            {/* Extracting indicator */}
            {extracting && (
                <Alert color="primary">Extracting data and detecting ownership...</Alert>
            )}

            {/* Error */}
            {error && <Alert color="danger">{error.message}</Alert>}

            {/* Client Clarification UI (shown when ownership uncertain) */}
            {needsClarification && result && (
                <Alert color="warning">
                    <Stack spacing={2}>
                        <Typography level="title-sm">
                            Whose paystub is this?
                        </Typography>
                        <Typography level="body-sm">
                            We couldn't automatically determine who this paystub belongs to.
                            Please select the correct owner:
                        </Typography>

                        <Select
                            value={clarificationAnswer}
                            onChange={(_, value) => value && setClarificationAnswer(value)}
                        >
                            <Option value="debtor">
                                {String(answers.debtor_full_name || 'Debtor')} only
                            </Option>
                            {isJoint && (
                                <Option value="spouse">
                                    {String(answers.spouse_full_name || 'Spouse')} only
                                </Option>
                            )}
                            {isJoint && (
                                <Option value="joint">
                                    Both (Joint)
                                </Option>
                            )}
                        </Select>

                        <Button onClick={handleClarificationSubmit}>
                            Confirm and Apply Data
                        </Button>
                    </Stack>
                </Alert>
            )}

            {/* Success message (auto-detected) */}
            {!needsClarification && result && ownership && (
                <Alert color="success">
                    <Stack spacing={1}>
                        <Typography level="body-sm">
                            ✓ Data extracted and auto-assigned to{' '}
                            {ownership.ownership === 'debtor' && 'debtor'}
                            {ownership.ownership === 'spouse' && 'spouse'}
                            {ownership.ownership === 'joint' && 'both'}
                        </Typography>
                        <Typography level="body-xs" sx={{ opacity: 0.7 }}>
                            Confidence: {Math.round(ownership.confidence * 100)}%
                        </Typography>
                    </Stack>
                </Alert>
            )}

            {/* Debug: Show detected signals */}
            {ownership && (
                <Alert color="neutral" variant="soft" size="sm">
                    <Typography level="body-xs">
                        <strong>Detection signals:</strong>
                        <ul style={{ marginBottom: 0 }}>
                            {ownership.signals.map((signal, i) => (
                                <li key={i}>
                                    {signal.owner} ({Math.round(signal.confidence * 100)}%) -{' '}
                                    {signal.source}: {signal.reasoning}
                                </li>
                            ))}
                        </ul>
                    </Typography>
                </Alert>
            )}
        </Stack>
    );
}
