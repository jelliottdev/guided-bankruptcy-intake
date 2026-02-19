import { describe, expect, it } from 'vitest';
import { buildReadinessVM } from './readinessVM';

describe('buildReadinessVM', () => {
  it('returns not_ready when criteria fail', () => {
    const vm = buildReadinessVM({
      answers: {},
      uploads: {},
      flags: {},
      missingFieldLabels: ['Debtor full name'],
      requiredDocsVerifiedOrWaived: false,
      criticalRisksReviewed: false,
      attorneyApprovalGatePassed: false,
    });
    expect(vm.gate).toBe('not_ready');
    expect(vm.blockerCount).toBeGreaterThan(0);
  });

  it('returns ready_to_draft when criteria pass', () => {
    const vm = buildReadinessVM({
      answers: {},
      uploads: {
        upload_paystubs: ['a.pdf'],
        upload_tax_returns: ['b.pdf'],
      },
      flags: {},
      missingFieldLabels: [],
      requiredDocsVerifiedOrWaived: true,
      criticalRisksReviewed: true,
      attorneyApprovalGatePassed: true,
    });
    expect(vm.gate).toBe('ready_to_draft');
  });
});
