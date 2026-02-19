import { Card, Typography, Button, Chip, Stack, Alert, Box, LinearProgress } from '@mui/joy';
import { CheckCircle, Warning, ErrorOutline } from '@mui/icons-material';
import type { OcrResult } from '@/api/ocr';

interface ExtractedDataReviewProps {
    data: Record<string, any>;
    confidence: number;
    warnings?: string[];
    documentType?: string;
    onAccept: () => void;
    onReject: () => void;
}

function formatFieldName(key: string): string {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(value: any): string {
    if (typeof value === 'number') {
        // Check if it looks like currency
        if (value > 0 && value < 1000000) {
            return `$${value.toFixed(2)}`;
        }
        return value.toString();
    }
    return String(value);
}

export function ExtractedDataReview({
    data,
    confidence,
    warnings = [],
    documentType = 'document',
    onAccept,
    onReject,
}: ExtractedDataReviewProps) {
    const confidencePercent = Math.round(confidence * 100);

    // Determine confidence color/icon
    const getConfidenceConfig = () => {
        if (confidence >= 0.85) {
            return { color: 'success' as const, icon: <CheckCircle />, label: 'High Confidence' };
        } else if (confidence >= 0.70) {
            return { color: 'warning' as const, icon: <Warning />, label: 'Medium Confidence' };
        } else {
            return { color: 'danger' as const, icon: <ErrorOutline />, label: 'Low Confidence' };
        }
    };

    const config = getConfidenceConfig();
    const fieldCount = Object.keys(data).length;

    return (
        <Card variant="soft" color="primary" sx={{ mt: 2, mb: 2 }}>
            <Stack spacing={2}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography level="title-md" startDecorator={config.icon}>
                        Data Found in {formatFieldName(documentType)}
                    </Typography>
                    <Chip size="sm" color={config.color} variant="soft">
                        {confidencePercent}% {config.label}
                    </Chip>
                </Box>

                {/* Confidence bar */}
                <Box>
                    <LinearProgress
                        determinate
                        value={confidencePercent}
                        color={config.color}
                        size="sm"
                        sx={{ mb: 0.5 }}
                    />
                    <Typography level="body-xs" textColor="text.tertiary">
                        {fieldCount} field{fieldCount !== 1 ? 's' : ''} extracted
                    </Typography>
                </Box>

                {/* Warnings */}
                {warnings.length > 0 && (
                    <Alert color="warning" variant="soft" size="sm">
                        <Stack spacing={0.5}>
                            {warnings.map((warning, idx) => (
                                <Typography key={idx} level="body-sm">
                                    • {warning}
                                </Typography>
                            ))}
                        </Stack>
                    </Alert>
                )}

                {/* Extracted fields */}
                <Stack spacing={1.5} sx={{ maxHeight: 300, overflow: 'auto', pr: 1 }}>
                    {Object.entries(data).map(([key, value]) => (
                        <Box
                            key={key}
                            sx={{
                                p: 1.5,
                                bgcolor: 'background.level1',
                                borderRadius: 'sm',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography level="body-xs" textColor="text.tertiary" sx={{ mb: 0.5 }}>
                                {formatFieldName(key)}
                            </Typography>
                            <Typography level="body-md" fontWeight="md">
                                {formatFieldValue(value)}
                            </Typography>
                        </Box>
                    ))}
                </Stack>

                {/* Action buttons */}
                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                    <Button
                        variant="solid"
                        color="primary"
                        onClick={onAccept}
                        sx={{ flex: 1 }}
                    >
                        Use This Data
                    </Button>
                    <Button
                        variant="outlined"
                        color="neutral"
                        onClick={onReject}
                        sx={{ flex: 1 }}
                    >
                        Enter Manually
                    </Button>
                </Stack>

                {confidence < 0.70 && (
                    <Alert color="warning" size="sm" variant="soft">
                        <Typography level="body-xs">
                            <strong>Review Carefully:</strong> Extraction confidence is low. Please verify all values before accepting.
                        </Typography>
                    </Alert>
                )}
            </Stack>
        </Card>
    );
}
