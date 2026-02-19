/**
 * Integration test: seeded answers → intakeToCanonical → generateB101.
 * Locks the contract: transform produces B101-critical canonical values; generateB101 runs without throw.
 * Optional: when template field names match, assert PDF checkboxes (see readAcroFields in CI).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getSeededAnswers } from '../../form/seedData';
import { intakeToCanonical } from '../transform';
import { generateB101 } from './b101';

const TEMPLATE_PATH = path.join(process.cwd(), 'public/forms/b101.pdf');

describe('B101 integration — seeded answers produce correct Form 101', () => {
  let templateBuffer: ArrayBuffer | null = null;

  beforeAll(() => {
    if (fs.existsSync(TEMPLATE_PATH)) {
      templateBuffer = fs.readFileSync(TEMPLATE_PATH).buffer;
    }
  });

  it('intakeToCanonical(seeded) has B101-critical canonical values', () => {
    const answers = getSeededAnswers();
    const canonical = intakeToCanonical(answers);
    expect(canonical.filing.chapter).toBe('13');
    expect(canonical.filing.feePayment).toBe('installments');
    expect(canonical.reporting.debtType).toBe('consumer');
    expect(canonical.reporting.estimatedAssets).toBe('500001-1000000');
    expect(canonical.reporting.estimatedLiabilities).toBe('500001-1000000');
  });

  it('generateB101(seeded canonical + attorney) completes and returns PDF bytes', async () => {
    if (!templateBuffer) {
      console.warn('B101 template not found at public/forms/b101.pdf; skipping');
      return;
    }
    const answers = getSeededAnswers();
    const canonical = intakeToCanonical(answers);
    const now = new Date().toISOString();
    const withAttorney = {
      ...canonical,
      attorney: {
        name: 'Test Attorney',
        firmName: 'Test Firm',
        address: { street1: '123 Main', city: 'Orlando', state: 'FL', zip: '32801' },
        phone: '555-0100',
        email: 'test@example.com',
        barNumber: '12345',
        barState: 'FL',
        signatureDate: now,
      },
      debtor1SignatureDate: now,
      debtor2SignatureDate: now,
    };
    const pdfBytes = await generateB101(withAttorney, templateBuffer);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
