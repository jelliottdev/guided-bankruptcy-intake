import { describe, expect, it } from 'vitest';
import { reconcileOcrResultAgainstAnswers } from './reconcile';
import type { Answers } from '../form/types';
import type { OcrResult } from './types';

describe('ocr/reconcile', () => {
  it('flags conflict when paystub gross differs from intake', () => {
    const answers = { debtor_gross_pay: '1000', income_current_ytd: '' } as unknown as Answers;
    const result: OcrResult = {
      fileId: 'f1',
      assignmentId: 'a1',
      nodeId: 'n1',
      legacyFieldId: 'upload_paystubs',
      name: 'paystub.pdf',
      uploadedAt: new Date().toISOString(),
      status: 'done',
      ocrConfidence: 0.9,
      docType: 'paystub',
      extracted: {
        docType: 'paystub',
        fields: {
          grossPay: { value: 1400, confidence: 0.6, source: 'ocr' },
        },
      },
    };
    const review = reconcileOcrResultAgainstAnswers(answers, result);
    expect(review?.needsReview).toBe(true);
    expect(review?.reason).toBe('conflict');
  });

  it('keeps existing review when no conflict is detected', () => {
    const answers = { debtor_gross_pay: '1000', income_current_ytd: '' } as unknown as Answers;
    const result: OcrResult = {
      fileId: 'f1',
      assignmentId: 'a1',
      nodeId: 'n1',
      legacyFieldId: 'upload_paystubs',
      name: 'paystub.pdf',
      uploadedAt: new Date().toISOString(),
      status: 'done',
      ocrConfidence: 0.5,
      docType: 'paystub',
      extracted: { docType: 'paystub', fields: { grossPay: { value: 1000, confidence: 0.6, source: 'ocr' } } },
      review: { needsReview: true, reason: 'low_confidence', detail: 'Low OCR confidence.' },
    };
    const review = reconcileOcrResultAgainstAnswers(answers, result);
    expect(review?.reason).toBe('low_confidence');
  });

  it('returns null for non-done results', () => {
    const answers = {} as unknown as Answers;
    const result: OcrResult = {
      fileId: 'f1',
      assignmentId: 'a1',
      nodeId: 'n1',
      name: 'paystub.pdf',
      uploadedAt: new Date().toISOString(),
      status: 'processing',
    };
    const review = reconcileOcrResultAgainstAnswers(answers, result);
    expect(review).toBeNull();
  });
});

