import { describe, it, expect } from 'vitest';
import {
  intakeToCanonical,
  normalizeFeePayment,
  normalizeDebtType,
  normalizeAssetLiabilityRange,
} from './transform';
import type { Answers } from '../form/types';

describe('normalizeFeePayment', () => {
  it('maps "installments" → installments', () => {
    expect(normalizeFeePayment('installments')).toBe('installments');
  });
  it('maps "Installments" (case) → installments', () => {
    expect(normalizeFeePayment('Installments')).toBe('installments');
  });
  it('maps phrase containing "installment" → installments', () => {
    expect(normalizeFeePayment('I need to pay the fee in installments')).toBe('installments');
  });
  it('maps "waiver" / "fee_waiver" → waiver_request', () => {
    expect(normalizeFeePayment('waiver')).toBe('waiver_request');
    expect(normalizeFeePayment('fee_waiver')).toBe('waiver_request');
  });
  it('maps empty/unknown → full', () => {
    expect(normalizeFeePayment('')).toBe('full');
    expect(normalizeFeePayment(null)).toBe('full');
    expect(normalizeFeePayment(undefined)).toBe('full');
    expect(normalizeFeePayment('pay entire')).toBe('full');
  });
});

describe('normalizeDebtType', () => {
  it('maps "consumer" → consumer', () => {
    expect(normalizeDebtType('consumer')).toBe('consumer');
  });
  it('maps "business" → business', () => {
    expect(normalizeDebtType('business')).toBe('business');
  });
  it('maps "both" → other', () => {
    expect(normalizeDebtType('both')).toBe('other');
  });
  it('maps empty/unknown → consumer', () => {
    expect(normalizeDebtType('')).toBe('consumer');
    expect(normalizeDebtType(null)).toBe('consumer');
  });
});

describe('normalizeAssetLiabilityRange', () => {
  it('maps "500001-1000000" → 500001-1000000', () => {
    expect(normalizeAssetLiabilityRange('500001-1000000')).toBe('500001-1000000');
  });
  it('maps "0-50000" → 0-50000', () => {
    expect(normalizeAssetLiabilityRange('0-50000')).toBe('0-50000');
  });
  it('normalizes spaces and underscores', () => {
    expect(normalizeAssetLiabilityRange('500001 - 1000000')).toBe('500001-1000000');
    expect(normalizeAssetLiabilityRange('500001_1000000')).toBe('500001-1000000');
  });
  it('returns default for empty or invalid', () => {
    expect(normalizeAssetLiabilityRange('')).toBe('0-50000');
    expect(normalizeAssetLiabilityRange(null)).toBe('0-50000');
    expect(normalizeAssetLiabilityRange('$500k')).toBe('0-50000');
  });
});

describe('intakeToCanonical — B101-critical mappings', () => {
  it('maps filing_fee_method → filing.feePayment', () => {
    const result = intakeToCanonical({ filing_fee_method: 'installments' } as Answers);
    expect(result.filing.feePayment).toBe('installments');
  });
  it('maps fee_payment when filing_fee_method missing', () => {
    const result = intakeToCanonical({ fee_payment: 'installments' } as Answers);
    expect(result.filing.feePayment).toBe('installments');
  });
  it('maps debt_nature → reporting.debtType', () => {
    const result = intakeToCanonical({ debt_nature: 'consumer' } as Answers);
    expect(result.reporting.debtType).toBe('consumer');
  });
  it('maps asset_range → reporting.estimatedAssets', () => {
    const result = intakeToCanonical({ asset_range: '500001-1000000' } as Answers);
    expect(result.reporting.estimatedAssets).toBe('500001-1000000');
  });
  it('maps liability_range → reporting.estimatedLiabilities', () => {
    const result = intakeToCanonical({ liability_range: '500001-1000000' } as Answers);
    expect(result.reporting.estimatedLiabilities).toBe('500001-1000000');
  });
  it('seeded answers produce correct B101 canonical values', async () => {
    const { getSeededAnswers } = await import('../form/seedData');
    const answers = getSeededAnswers();
    const canonical = intakeToCanonical(answers);
    expect(canonical.filing.chapter).toBe('13');
    expect(canonical.filing.feePayment).toBe('installments');
    expect(canonical.reporting.debtType).toBe('consumer');
    expect(canonical.reporting.estimatedAssets).toBe('500001-1000000');
    expect(canonical.reporting.estimatedLiabilities).toBe('500001-1000000');
  });
});
