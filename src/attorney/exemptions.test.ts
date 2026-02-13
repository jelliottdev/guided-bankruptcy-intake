import { describe, it, expect } from 'vitest';
import {
  FEDERAL_EXEMPTIONS,
  runExemptionAnalysis,
  getExemptionStateOptions,
} from './exemptions';
import type { Answers } from '../form/types';

describe('exemptions', () => {
  describe('FEDERAL_EXEMPTIONS', () => {
    it('has expected shape', () => {
      expect(FEDERAL_EXEMPTIONS.name).toBe('Federal');
      expect(FEDERAL_EXEMPTIONS.homestead).toBe(27900);
      expect(FEDERAL_EXEMPTIONS.vehicle).toBe(4650);
    });
  });

  describe('runExemptionAnalysis', () => {
    it('returns empty assets when no real estate or vehicles or bank accounts', () => {
      const r = runExemptionAnalysis({} as Answers, 'federal');
      expect(r.assets.length).toBe(0);
      expect(r.totalValue).toBe(0);
      expect(r.totalExempt).toBe(0);
      expect(r.totalNonExempt).toBe(0);
    });
    it('includes real estate when has real estate', () => {
      const answers: Answers = {
        real_estate_ownership: 'Yes, I own real estate',
        real_estate_count: '1',
        property_1_value: '200000',
      };
      const r = runExemptionAnalysis(answers, 'federal');
      expect(r.assets.some((a) => a.category === 'Real estate')).toBe(true);
      expect(r.totalValue).toBe(200000);
      expect(r.totalExempt).toBeLessThanOrEqual(27900);
      expect(r.totalNonExempt).toBeGreaterThan(0);
    });
    it('uses federal set when stateOrFederal is federal', () => {
      const r = runExemptionAnalysis({} as Answers, 'federal');
      expect(r.exemptionSet.name).toBe('Federal');
    });
  });

  describe('getExemptionStateOptions', () => {
    it('includes federal and state names', () => {
      const opts = getExemptionStateOptions();
      expect(opts[0]).toBe('federal');
      expect(opts).toContain('California');
      expect(opts).toContain('New York');
    });
  });
});
