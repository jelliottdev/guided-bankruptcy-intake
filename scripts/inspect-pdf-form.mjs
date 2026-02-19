/**
 * Inspect any PDF's AcroForm: list field names, types, and current values.
 * Usage: node scripts/inspect-pdf-form.mjs "/path/to/file.pdf"
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const pdfPath = process.argv[2];
if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Usage: node scripts/inspect-pdf-form.mjs "/path/to/file.pdf"');
  process.exit(1);
}

function decodeKey(s) {
  if (typeof s !== 'string') return String(s);
  return s.replace(/#20/g, ' ').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

async function run() {
  const buffer = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('=== PDF Form Fields ===');
  console.log('File:', path.basename(pdfPath));
  console.log('Total fields:', fields.length);
  console.log('');

  const rows = [];
  for (const f of fields) {
    const type = f.constructor.name;
    const name = f.getName();
    let value = '';
    let raw = '';
    try {
      if (type === 'PDFTextField') {
        value = f.getText() || '(empty)';
      } else if (type === 'PDFCheckBox') {
        value = f.isChecked() ? 'checked' : 'unchecked';
        const dict = f.acroField?.dict;
        if (dict) {
          try {
            const v = dict.get(PDFName.of('V'));
            const as = dict.get(PDFName.of('AS'));
            if (v) raw = ' V=' + String(v);
            if (as) raw += ' AS=' + decodeKey(String(as));
          } catch (_) {}
        }
      } else if (type === 'PDFDropdown') {
        const opts = f.getOptions?.() || [];
        const sel = f.getSelected?.();
        value = sel?.length ? sel.join(', ') : '(none)';
        if (opts.length <= 25) raw = ' options: [' + opts.map(o => decodeKey(String(o))).join(', ') + ']';
      }
    } catch (e) {
      value = '(err: ' + e.message + ')';
    }
    rows.push({ name, type, value, raw });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const r of rows) {
    console.log(r.name);
    console.log('  ' + r.type + '  Value: ' + r.value + (r.raw || ''));
  }

  // Emit key B101-like fields for seeding
  console.log('\n--- Suggested seed / canonical (from current values) ---');
  const keyNames = /chapter|fee|consumer|asset|liabilit|date|signed|executed|venue|check box/i;
  const keyFields = rows.filter(r => keyNames.test(r.name));
  keyFields.forEach(r => {
    console.log(r.name + ' => ' + r.value + (r.raw ? ' ' + r.raw : ''));
  });
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
