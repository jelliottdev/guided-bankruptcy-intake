import { describe, it, expect } from 'vitest';
import {
  getMedianAnnualIncome,
  getHouseholdSizeFromAnswers,
  computeCMIFromAnswers,
  runMeansTest,
  getMedianIncomeStates,
} from './meansTest';
import type { Answers } from '../form/types';

describe('meansTest', () => {
  describe('getMedianAnnualIncome', () => {
    it('returns median for state and household size 1-4', () => {
      expect(getMedianAnnualIncome('California', 1)).toBe(74007);
      expect(getMedianAnnualIncome('California', 4)).toBe(127096);
      expect(getMedianAnnualIncome('Texas', 2)).toBe(80658);
    });
    it('returns base + 9900 per additional person for household size > 4', () => {
      const four = getMedianAnnualIncome('California', 4);
      expect(getMedianAnnualIncome('California', 5)).toBe(four! + 9900);
      expect(getMedianAnnualIncome('California', 6)).toBe(four! + 9900 * 2);
    });
    it('returns null for unknown state', () => {
      expect(getMedianAnnualIncome('Unknown State', 1)).toBeNull();
    });
  });

  describe('getHouseholdSizeFromAnswers', () => {
    it('returns 2 for joint filing', () => {
      expect(getHouseholdSizeFromAnswers({ filing_setup: 'Filing with spouse' } as Answers)).toBe(2);
    });
    it('returns 1 for single', () => {
      expect(getHouseholdSizeFromAnswers({ filing_setup: 'Filing alone' } as Answers)).toBe(1);
    });
  });

  describe('computeCMIFromAnswers', () => {
    it('uses monthly pay when present', () => {
      expect(computeCMIFromAnswers({ debtor_gross_pay: '3000' } as Answers)).toBe(3000);
      expect(computeCMIFromAnswers({
        debtor_gross_pay: '2000',
        spouse_gross_pay: '1500',
        filing_setup: 'Filing with spouse',
      } as Answers)).toBe(3500);
    });
    it('uses YTD/6 when no monthly pay', () => {
      expect(computeCMIFromAnswers({ income_current_ytd: '18000' } as Answers)).toBe(3000);
    });
    it('returns 0 when no income data', () => {
      expect(computeCMIFromAnswers({} as Answers)).toBe(0);
    });
  });

  describe('runMeansTest', () => {
    it('returns pass when CMI <= median', () => {
      const r = runMeansTest(
        { debtor_gross_pay: '3000', filing_setup: 'Filing alone' } as Answers,
        'California'
      );
      expect(r.pass).toBe(true);
      expect(r.state).toBe('California');
      expect(r.currentMonthlyIncome).toBe(3000);
    });
    it('returns fail when CMI > median', () => {
      const r = runMeansTest(
        { debtor_gross_pay: '15000', filing_setup: 'Filing alone' } as Answers,
        'California'
      );
      expect(r.pass).toBe(false);
    });
    it('returns null pass and note when state not selected', () => {
      const r = runMeansTest({ debtor_gross_pay: '3000' } as Answers);
      expect(r.pass).toBeNull();
      expect(r.note).toContain('Select state');
    });
  });

  describe('getMedianIncomeStates', () => {
    it('returns array of state names', () => {
      const states = getMedianIncomeStates();
      expect(states).toContain('California');
      expect(states).toContain('New York');
      expect(states.length).toBeGreaterThan(40);
    });
  });
});
