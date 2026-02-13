import { describe, it, expect } from 'vitest';
import {
  isJointFiling,
  getRealEstateCount,
  getMailingDifferent,
} from '../utils/logic';
import type { Answers } from '../form/types';

describe('logic', () => {
  describe('isJointFiling', () => {
    it('returns true when filing with spouse', () => {
      expect(isJointFiling({ filing_setup: 'Filing with spouse' } as Answers)).toBe(true);
    });
    it('returns false when filing alone', () => {
      expect(isJointFiling({ filing_setup: 'Filing alone' } as Answers)).toBe(false);
    });
  });

  describe('getRealEstateCount', () => {
    it('returns parsed count 1-20', () => {
      expect(getRealEstateCount({ real_estate_count: '1' } as Answers)).toBe(1);
      expect(getRealEstateCount({ real_estate_count: '3' } as Answers)).toBe(3);
    });
    it('returns 1 for invalid or missing', () => {
      expect(getRealEstateCount({} as Answers)).toBe(1);
    });
  });

  describe('getMailingDifferent', () => {
    it('returns true when mailing is different', () => {
      expect(getMailingDifferent({ mailing_different: 'Yes' } as Answers)).toBe(true);
    });
  });
});
