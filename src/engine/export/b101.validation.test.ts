/**
 * B101 backend validation loop: generate from gold fixture, then assert filled PDF.
 * Run: npm run test -- src/engine/export/b101.validation.test.ts
 * Optional: WRITE_B101=1 npm run test -- ... to write tmp/b101-output.pdf for visual check.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getB101GoldInput } from './b101-gold-fixture';
import { generateB101 } from './b101';
import { assertB101Gold } from './b101-validate';

const TEMPLATE_PATH = path.join(process.cwd(), 'public/forms/b101.pdf');
const OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'b101-output.pdf');

describe('B101 validation — generated PDF has all gold field values', () => {
  let templateBuffer: ArrayBuffer | null = null;

  beforeAll(() => {
    if (fs.existsSync(TEMPLATE_PATH)) {
      templateBuffer = fs.readFileSync(TEMPLATE_PATH).buffer;
    }
  });

  it('generateB101(gold) then assertB101Gold: all critical fields match', async () => {
    if (!templateBuffer) {
      console.warn('B101 template not found at public/forms/b101.pdf; skipping');
      return;
    }
    const gold = getB101GoldInput();
    const pdfBytes = await generateB101(gold, templateBuffer);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    if (process.env.WRITE_B101 === '1') {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, pdfBytes);
      console.log('Wrote', OUTPUT_PATH);
    }

    const result = await assertB101Gold(pdfBytes, gold);
    const msg = result.failed.length
      ? result.failed.map((f) => `${f.label}: expected ${String(f.expected)}, got ${String(f.actual)}`).join('; ')
      : '';
    expect(result.failed, msg).toHaveLength(0);
  });
});
