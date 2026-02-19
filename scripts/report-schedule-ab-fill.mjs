#!/usr/bin/env node
/**
 * Report Schedule A/B fill rate: generate PDF, read back, count filled vs total.
 * Usage: node scripts/report-schedule-ab-fill.mjs
 * (Runs the validation test with WRITE_SCHEDULE_AB=1 to produce the PDF, then analyzes it.)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'tmp', 'schedule-ab-output.pdf');
const templateFieldsPath = path.join(root, 'docs', 'form-fields', 'form_b106ab.json');
const fieldsWeSetPath = path.join(root, 'docs', 'form-requirements', 'schedule-ab-fields-we-set.json');

// 1. Generate the PDF if missing or stale
if (!fs.existsSync(outputPath)) {
  console.log('Generating Schedule A/B PDF...');
  const r = spawnSync('npm', ['run', 'test', '--', 'src/export/scheduleAB.validation.test.ts', '--run'], {
    cwd: root,
    env: { ...process.env, WRITE_SCHEDULE_AB: '1' },
    shell: true,
    stdio: 'pipe',
  });
  if (r.status !== 0) {
    console.error('Test failed:', r.stderr?.toString() || r.stdout?.toString());
    process.exit(1);
  }
}

// 2. Load filled PDF and get all field values
const pdfBuffer = fs.readFileSync(outputPath);
const doc = await PDFDocument.load(pdfBuffer);
const form = doc.getForm();
const fields = form.getFields();

const values = {};
for (const f of fields) {
  const name = f.getName();
  const type = f.constructor.name;
  try {
    if (type === 'PDFTextField') {
      const t = (f.getText && f.getText()) || '';
      values[name] = typeof t === 'string' ? t.trim() : String(t).trim();
    } else if (type === 'PDFCheckBox') {
      values[name] = f.isChecked();
    } else {
      values[name] = '(other)';
    }
  } catch (e) {
    values[name] = undefined;
  }
}

// 3. Load template field list for reference
const templateFields = JSON.parse(fs.readFileSync(templateFieldsPath, 'utf8')).fields;
const templateNames = new Set(templateFields.map((f) => f.name));

// 4. Count filled
let filledCount = 0;
const filledList = [];
const emptyList = [];
for (const f of templateFields) {
  const name = f.name;
  const v = values[name];
  const isFilled =
    v !== undefined &&
    v !== null &&
    v !== '' &&
    (typeof v !== 'boolean' || v === true);
  if (isFilled) {
    filledCount++;
    filledList.push({ name, type: f.type, value: typeof v === 'string' && v.length > 40 ? v.slice(0, 40) + '...' : v });
  } else {
    emptyList.push(name);
  }
}

const total = templateFields.length;
const pct = total ? ((filledCount / total) * 100).toFixed(1) : 0;

// 5. Fields we intend to set (from fillScheduleAB) - single source: docs/form-requirements/schedule-ab-fields-we-set.json
const fieldsWeSet = new Set(JSON.parse(fs.readFileSync(fieldsWeSetPath, 'utf8')));

// 6. Check: which of our set() targets are missing in template?
const missingInTemplate = [...fieldsWeSet].filter((n) => !templateNames.has(n));
// Which template fields we never touch (candidate "don't know" / missing mapping)
const weDontMap = emptyList.filter((n) => !fieldsWeSet.has(n));
// How many of the 111 we set actually exist and we filled
const weSetAndExist = [...fieldsWeSet].filter((n) => templateNames.has(n));
const weSetAndFilled = weSetAndExist.filter((n) => {
  const v = values[n];
  return v !== undefined && v !== null && v !== '' && (typeof v !== 'boolean' || v === true);
});

console.log('\n========== Schedule A/B fill report ==========\n');
console.log('Total template fields:', total);
console.log('Filled (non-empty / checked):', filledCount);
console.log('Fill rate:', pct + '%');
console.log('');
console.log('Mapping:');
console.log('  Fields we intend to set (in fillScheduleAB):', fieldsWeSet.size);
console.log('  Of those, exist in template:', weSetAndExist.length);
console.log('  Of those, actually filled:', weSetAndFilled.length);
console.log('  Template fields we do NOT map at all:', weDontMap.length);
if (missingInTemplate.length) {
  console.log('\n*** WRONG MAPPING (we set but not in template):', missingInTemplate.join(', '));
}
console.log('\n--- Filled fields (sample) ---');
filledList.slice(0, 35).forEach(({ name, value }) => console.log('  ', name, '=>', value));
console.log('\n--- Top sections still empty (we have no data or no mapping) ---');
const byPrefix = {};
weDontMap.forEach((n) => {
  const pre = n.replace(/^(\d+).*/, '$1');
  byPrefix[pre] = (byPrefix[pre] || 0) + 1;
});
Object.entries(byPrefix)
  .sort((a, b) => (b[1] - a[1]))
  .slice(0, 20)
  .forEach(([pre, count]) => console.log('  Part/Section', pre, ':', count, 'empty fields'));

console.log('\n--- Summary ---');
console.log('  Correct mapping: We fill', weSetAndFilled.length, 'fields that exist in the template.');
console.log('  Missing / unknown: ', weDontMap.length, 'template fields have no mapping (no data or not implemented).');
console.log('  To increase fill rate: add mapping + seed/input for Part 1 (1_2, 1_4, 1 1a), Part 2 (2_x, 3_2, 3_3), Part 3 (6 check, 12, 13, 14, 15), Part 4 (18–20, 23–34), business/farm (36–52), totals.');
console.log('\n==============================================\n');
