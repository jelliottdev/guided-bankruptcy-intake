import { describe, it, expect } from 'vitest';
import { CANONICAL_INTAKE_FIELD_IDS } from './caseSchema';
import { getSeededAnswers, getSeededUploads } from './seedData';
import { validateAll } from './validate';
import { getDocumentSufficiency } from '../attorney/snapshot';
import { intakeToCanonical } from '../engine/transform';

describe('Wallace seed data', () => {
  it('has an answer key for every canonical field id', () => {
    const answers = getSeededAnswers();
    const keys = new Set(Object.keys(answers));
    for (const id of CANONICAL_INTAKE_FIELD_IDS) {
      expect(keys.has(id)).toBe(true);
    }
  });

  it('passes validateAll with no required-field errors', () => {
    const answers = getSeededAnswers();
    const errors = validateAll(answers, undefined);
    const requiredErrors = errors.filter((e) => e.severity !== 'warning');
    expect(requiredErrors).toHaveLength(0);
  });

  it('has no Missing/Partial docs in getDocumentSufficiency', () => {
    const answers = getSeededAnswers();
    const uploads = getSeededUploads();
    const rows = getDocumentSufficiency(answers, uploads);
    const missingOrPartial = rows.filter((r) => r.status === 'Missing' || r.status === 'Partial');
    expect(missingOrPartial).toHaveLength(0);
  });

  it('includes mortgage docs in uploads', () => {
    const uploads = getSeededUploads();
    expect(Array.isArray(uploads.upload_mortgage_docs)).toBe(true);
    expect(uploads.upload_mortgage_docs!.length).toBeGreaterThan(0);
  });

  it('maps seed keys to canonical paths used by Form 101 (B101)', () => {
    const answers = getSeededAnswers();
    const canonical = intakeToCanonical(answers);
    expect(canonical.filing.chapter).toBe('13');
    expect(canonical.filing.feePayment).toBe('installments');
    expect(canonical.reporting.debtType).toBe('consumer');
    expect(canonical.reporting.estimatedAssets).toBe('500001-1000000');
    expect(canonical.reporting.estimatedLiabilities).toBe('500001-1000000');
  });
});
