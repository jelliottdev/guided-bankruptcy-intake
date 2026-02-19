/**
 * Schedule A/B validation: generate from gold (seed), then assert filled PDF.
 * Run: npm run test -- src/export/scheduleAB.validation.test.ts
 * Optional: WRITE_SCHEDULE_AB=1 npm run test -- ... to write tmp/schedule-ab-output.pdf
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { getSeededAnswers } from '../form/seedData';
import { mapRealEstateToScheduleA } from './scheduleA';
import { mapAssetsToScheduleB } from './scheduleB';
import { fillScheduleAB } from './fillScheduleAB';
import { assertScheduleABGold } from './scheduleAB-validate';
import { getScheduleABPdfFieldsWeSet } from './scheduleABFields';

const TEMPLATE_PATH = path.join(process.cwd(), 'public/forms/form_b106ab.pdf');
const OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'schedule-ab-output.pdf');
const TEMPLATE_FIELDS_JSON = path.join(process.cwd(), 'docs/form-fields/form_b106ab.json');

describe('Schedule A/B validation — generated PDF has gold field values', () => {
  let templateBuffer: ArrayBuffer | null = null;

  beforeAll(() => {
    if (fs.existsSync(TEMPLATE_PATH)) {
      templateBuffer = fs.readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer;
    }
  });

  it('fillScheduleAB(gold) then assertScheduleABGold: critical fields match', async () => {
    if (!templateBuffer) {
      console.warn('Schedule A/B template not found at public/forms/form_b106ab.pdf; skipping');
      return;
    }
    const answers = getSeededAnswers();
    const scheduleAData = mapRealEstateToScheduleA(answers);
    const scheduleBData = mapAssetsToScheduleB(answers);

    const pdfDoc = await PDFDocument.load(templateBuffer);
    await fillScheduleAB(pdfDoc, scheduleAData, scheduleBData);
    const pdfBytes = await pdfDoc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    if (process.env.WRITE_SCHEDULE_AB === '1') {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, pdfBytes);
      console.log('Wrote', OUTPUT_PATH);
    }

    const result = await assertScheduleABGold(pdfBytes, scheduleAData, scheduleBData);
    const msg = result.failed.length
      ? result.failed
          .map((f) => `${f.label}: expected ${String(f.expected)}, got ${String(f.actual)}`)
          .join('; ')
      : '';
    expect(result.failed, msg).toHaveLength(0);
  });
});

describe('Schedule A/B template-field assertion', () => {
  it('every field we set exists in the template', () => {
    const fieldsWeSet = getScheduleABPdfFieldsWeSet();
    if (!fs.existsSync(TEMPLATE_FIELDS_JSON)) {
      console.warn('Template fields JSON not found; skipping');
      return;
    }
    const template = JSON.parse(fs.readFileSync(TEMPLATE_FIELDS_JSON, 'utf8'));
    const templateNames = new Set((template.fields as Array<{ name: string }>).map((f) => f.name));
    const missing = [...fieldsWeSet].filter((name) => !templateNames.has(name));
    expect(
      missing,
      `Fields we set but missing in template (rename or update schedule-ab-fields-we-set.json): ${missing.join(', ')}`
    ).toHaveLength(0);
  });
});
