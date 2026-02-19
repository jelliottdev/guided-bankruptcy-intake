import { describe, expect, it } from 'vitest';
import { classifyDoc, extractFromText } from './extractors';

describe('ocr/extractors', () => {
  it('classifies and extracts paystub fields', () => {
    const text = `
      PAY STUB
      Employer: ACME Corp
      Gross Pay: $1,250.00
      Net Pay: $945.32
      YTD Gross Earnings: $12,500.00
    `;
    const docType = classifyDoc(text);
    expect(docType).toBe('paystub');
    const fields = extractFromText(docType, text);
    expect(fields.grossPay?.value).toBe(1250);
    expect(fields.netPay?.value).toBe(945.32);
    expect(fields.ytdGross?.value).toBe(12500);
  });

  it('extracts TOTAL GROSS and chooses best NET PAY value near label', () => {
    const text = `
      BOARD OF COUNTY COMMISSIONERS
      TOTAL GROSS 3,065.84
      NET PAY 401.53 318.15 2,346.16
    `;
    const docType = classifyDoc(text);
    expect(docType).toBe('paystub');
    const fields = extractFromText(docType, text);
    expect(fields.grossPay?.value).toBe(3065.84);
    expect(fields.netPay?.value).toBe(2346.16);
  });

  it('classifies and extracts bank statement fields', () => {
    const text = `
      Bank Statement
      Statement period: 01/01/2026 - 01/31/2026
      Ending balance: $4,321.98
    `;
    const docType = classifyDoc(text);
    expect(docType).toBe('bank_statement');
    const fields = extractFromText(docType, text);
    expect(fields.endingBalance?.value).toBe(4321.98);
  });

  it('classifies and extracts tax return fields', () => {
    const text = `
      Form 1040
      Tax Year: 2024
      Adjusted Gross Income: $55,000
    `;
    const docType = classifyDoc(text);
    expect(docType).toBe('tax_return');
    const fields = extractFromText(docType, text);
    expect(fields.taxYear?.value).toBe(2024);
    expect(fields.agi?.value).toBe(55000);
  });
});
