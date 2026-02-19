/**
 * Side-by-side review of OCR conflicts: intake value vs OCR value with Accept / Keep actions.
 */
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { OcrResult } from '../../../ocr/types';

const REVIEW_REASON_LABELS: Record<string, string> = {
  conflict: 'Conflict with intake',
  low_confidence: 'Low confidence',
  unreadable: 'Unreadable',
  unknown_type: 'Unknown document type',
  partial_pdf: 'Partial PDF',
  missing_blob: 'File unavailable',
  too_large: 'Too large',
  unsupported: 'Unsupported',
};

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
  return String(value).trim() || '—';
}

export interface ReviewConflictsProps {
  results: OcrResult[];
  onAcceptOcr: (fieldId: string, value: string) => void;
  onKeepIntake: (fileId: string) => void;
}

export function ReviewConflicts({ results, onAcceptOcr, onKeepIntake }: ReviewConflictsProps) {
  const needsReview = results.filter((r) => r.review?.needsReview);
  if (needsReview.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      <Typography level="title-sm">OCR review</Typography>
      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
        Resolve conflicts or low-confidence extractions.
      </Typography>
      {needsReview.map((result) => {
        const review = result.review!;
        const hasConflict = review.reason === 'conflict' && review.conflictFieldId != null;
        const intakeVal = hasConflict ? formatValue(review.conflictIntakeValue) : null;
        const ocrVal = hasConflict ? formatValue(review.conflictOcrValue) : null;

        return (
          <Sheet
            key={result.fileId}
            variant="outlined"
            sx={{ borderRadius: 'md', p: 1.25, borderColor: review.reason === 'conflict' ? 'warning.outlinedBorder' : 'neutral.outlinedBorder' }}
          >
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                  {result.name}
                </Typography>
                <Chip size="sm" color={review.reason === 'conflict' ? 'warning' : 'neutral'} variant="soft">
                  {REVIEW_REASON_LABELS[review.reason] ?? review.reason}
                </Chip>
              </Stack>
              {review.detail && (
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  {review.detail}
                </Typography>
              )}
              {hasConflict && intakeVal != null && ocrVal != null && (
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Box>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.25 }}>Intake value</Typography>
                    <Typography level="body-sm" sx={{ fontWeight: 600 }}>{intakeVal}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.25 }}>OCR value</Typography>
                    <Typography level="body-sm" sx={{ fontWeight: 600 }}>{ocrVal}</Typography>
                  </Box>
                </Stack>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {hasConflict && review.conflictFieldId && (
                  <Button
                    size="sm"
                    variant="solid"
                    color="primary"
                    onClick={() => onAcceptOcr(review.conflictFieldId!, String(review.conflictOcrValue ?? ''))}
                  >
                    Accept OCR
                  </Button>
                )}
                <Button size="sm" variant="soft" onClick={() => onKeepIntake(result.fileId)}>
                  {hasConflict ? 'Keep intake' : 'Dismiss'}
                </Button>
              </Stack>
            </Stack>
          </Sheet>
        );
      })}
    </Stack>
  );
}
