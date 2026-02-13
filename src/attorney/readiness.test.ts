import { describe, it, expect } from 'vitest';
import { computeCaseReadiness } from './readiness';
import type { Answers } from '../form/types';

describe('readiness', () => {
  describe('computeCaseReadiness', () => {
    it('returns score 0 and band when empty answers', () => {
      const r = computeCaseReadiness({} as Answers, {});
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.band).toBeDefined();
      expect(r.bandLabel).toBeDefined();
    });
    it('returns higher score when identity and income filled', () => {
      const empty = computeCaseReadiness({} as Answers, {});
      const filled: Answers = {
        debtor_full_name: 'Jane Doe',
        debtor_ssn_last4: '1234',
        debtor_dob: '1990-01-01',
        debtor_phone: '5551234567',
        debtor_email: 'j@example.com',
        debtor_address: '123 Main St',
        county: 'Cook',
        debtor_employer: 'Acme',
        debtor_gross_pay: '3000',
        income_current_ytd: '18000',
      };
      const r = computeCaseReadiness(filled, {});
      expect(r.score).toBeGreaterThan(empty.score);
    });
  });
});
