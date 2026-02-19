import type { Answers } from '../form/types';
import type { OcrResult } from './types';

function parseMoneyLike(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/[,$\s]/g, '').trim();
  if (!text) return null;
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? num : null;
}

function ratioDiff(a: number, b: number): number {
  const denom = Math.max(1, Math.abs(b));
  return Math.abs(a - b) / denom;
}

/** Canonical income stub used for conflict checks */
type IncomeStub = { debtorGrossPay?: number; spouseGrossPay?: number; incomeCurrentYtd?: number };

/**
 * Reconcile OCR result against the canonical case (source of truth).
 * Prefer this over reconcileOcrResultAgainstAnswers when canonical is available.
 */
export function reconcileOcrResultAgainstCanonical(
  canonical: { incomeStub?: IncomeStub },
  result: OcrResult
): OcrResult['review'] | null {
  if (result.status !== 'done') return null;

  const existing = result.review?.needsReview ? result.review : null;
  const docType = result.docType ?? result.extracted?.docType ?? 'unknown';
  const extracted = result.extracted?.fields ?? {};
  const rawText = (result.rawText ?? '').trim();
  const hasAnyExtraction = Object.keys(extracted).length > 0;

  if (!rawText && !hasAnyExtraction && !existing) {
    return { needsReview: true, reason: 'unreadable', detail: 'No OCR text extracted.' };
  }

  if (docType === 'unknown' && !existing) {
    return { needsReview: false, reason: 'unknown_type', detail: 'Document type could not be classified.' };
  }

  const conf = result.ocrConfidence ?? 0;
  if (conf > 0 && conf < 0.6 && !existing) {
    return { needsReview: true, reason: 'low_confidence', detail: 'OCR confidence is low.' };
  }

  const income = canonical.incomeStub;
  const grossIntake = income?.debtorGrossPay ?? null;
  const grossExtracted = parseMoneyLike(extracted.grossPay?.value);
  const grossConf = extracted.grossPay?.confidence ?? 0;
  if (
    grossExtracted != null &&
    grossIntake != null &&
    grossConf >= 0.6 &&
    ratioDiff(grossExtracted, grossIntake) > 0.15
  ) {
    return {
      needsReview: true,
      reason: 'conflict',
      detail: `Paystub gross (${grossExtracted}) differs from intake (${grossIntake}).`,
      conflictFieldId: 'debtor_gross_pay',
      conflictIntakeValue: grossIntake,
      conflictOcrValue: grossExtracted,
    };
  }

  const ytdIntake = income?.incomeCurrentYtd ?? null;
  const ytdExtracted = parseMoneyLike(extracted.ytdGross?.value);
  const ytdConf = extracted.ytdGross?.confidence ?? 0;
  if (
    ytdExtracted != null &&
    ytdIntake != null &&
    ytdConf >= 0.6 &&
    ratioDiff(ytdExtracted, ytdIntake) > 0.2
  ) {
    return {
      needsReview: true,
      reason: 'conflict',
      detail: `Paystub YTD gross (${ytdExtracted}) differs from intake (${ytdIntake}).`,
      conflictFieldId: 'income_current_ytd',
      conflictIntakeValue: ytdIntake,
      conflictOcrValue: ytdExtracted,
    };
  }

  return existing;
}

/**
 * Reconcile against raw answers (backward compatibility).
 * Builds a minimal canonical stub from answers and delegates to reconcileOcrResultAgainstCanonical.
 */
export function reconcileOcrResultAgainstAnswers(
  answers: Answers,
  result: OcrResult
): OcrResult['review'] | null {
  const debtorGross = parseMoneyLike(answers['debtor_gross_pay']);
  const ytd = parseMoneyLike(answers['income_current_ytd']);
  const canonical: { incomeStub?: IncomeStub } = {
    incomeStub: {
      debtorGrossPay: debtorGross ?? undefined,
      incomeCurrentYtd: ytd ?? undefined,
    },
  };
  return reconcileOcrResultAgainstCanonical(canonical, result);
}
