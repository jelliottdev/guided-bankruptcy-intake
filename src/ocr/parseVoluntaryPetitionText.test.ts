import { describe, it, expect } from 'vitest';
import { parseVoluntaryPetitionText } from './parseVoluntaryPetitionText';

describe('parseVoluntaryPetitionText', () => {
  it('extracts chapter 13 and installments', () => {
    const text = 'Voluntary Petition under Chapter 13. Pay filing fee in installments.';
    const out = parseVoluntaryPetitionText(text);
    expect(out.filing_chapter).toBe('13');
    expect(out.filing_fee_method).toBe('installments');
  });

  it('extracts consumer debt', () => {
    const text = 'Debtor certifies that the debts are primarily consumer debts.';
    const out = parseVoluntaryPetitionText(text);
    expect(out.debt_nature).toBe('consumer');
  });

  it('extracts asset/liability range 500001-1000000', () => {
    const text = 'Estimated assets $500,001 - $1,000,000. Estimated liabilities $500,001 - $1,000,000.';
    const out = parseVoluntaryPetitionText(text);
    expect(out.asset_range).toBe('500001-1000000');
    expect(out.liability_range).toBe('500001-1000000');
  });

  it('extracts date MM/DD/YYYY', () => {
    const text = 'Executed on 11/26/2025.';
    const out = parseVoluntaryPetitionText(text);
    expect(out.filing_date).toBe('2025-11-26');
  });

  it('returns empty for empty or irrelevant text', () => {
    expect(parseVoluntaryPetitionText('')).toEqual({});
    expect(parseVoluntaryPetitionText('   ')).toEqual({});
    expect(parseVoluntaryPetitionText('Random memo.')).toEqual({});
  });
});
