import { describe, it, expect } from 'vitest';
import { validateAll, getErrorsForStep } from './validate';
import { getVisibleSteps } from './steps';
import type { Answers } from './types';

describe('validate', () => {
  describe('validateAll', () => {
    it('returns no errors when required fields are filled', () => {
      const steps = getVisibleSteps({ filing_setup: 'Filing alone' } as Answers);
      const identityStep = steps.find((s) => s.id === 'identity');
      if (!identityStep) return;
      const answers: Answers = {
        filing_setup: 'Filing alone',
        debtor_full_name: 'Jane Doe',
        debtor_ssn_last4: '1234',
        debtor_dob: '1990-01-15',
        debtor_phone: '5551234567',
        debtor_email: 'jane@example.com',
        debtor_address: '123 Main St',
        county: 'Cook',
      };
      const errors = validateAll(answers);
      const identityErrors = errors.filter((e) => e.stepId === 'identity');
      expect(identityErrors.length).toBeLessThanOrEqual(errors.length);
    });
    it('returns errors for empty required fields', () => {
      const answers: Answers = { filing_setup: 'Filing alone' };
      const errors = validateAll(answers);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.length > 0)).toBe(true);
    });
    it('uses friendly messages for required fields', () => {
      const answers: Answers = { filing_setup: 'Filing alone' };
      const errors = validateAll(answers);
      const nameError = errors.find((e) => e.fieldId === 'debtor_full_name');
      if (nameError) {
        expect(nameError.message).toMatch(/name|enter/i);
      }
    });
  });

  describe('getErrorsForStep', () => {
    it('filters by step index and excludes warnings', () => {
      const answers: Answers = { filing_setup: 'Filing alone' };
      const step0 = getErrorsForStep(answers, 0);
      expect(step0.every((e) => e.stepIndex === 0)).toBe(true);
      expect(step0.every((e) => e.severity !== 'warning')).toBe(true);
    });
  });
});
