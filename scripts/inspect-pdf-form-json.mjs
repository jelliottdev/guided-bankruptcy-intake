/**
 * Inspect a PDF's AcroForm and write field list to JSON.
 * Usage: node scripts/inspect-pdf-form-json.mjs "/path/to/file.pdf" [output.json]
 * If output is omitted, writes to docs/form-fields/<basename>.json
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const pdfPath = process.argv[2];
if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Usage: node scripts/inspect-pdf-form-json.mjs "/path/to/file.pdf" [output.json]');
  process.exit(1);
}

const outPath = process.argv[3] || path.join(process.cwd(), 'docs/form-fields', path.basename(pdfPath, '.pdf') + '.json');

function decodeKey(s) {
  if (typeof s !== 'string') return String(s);
  return s.replace(/#20/g, ' ').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

async function run() {
  const buffer = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const rows = [];
  for (const f of fields) {
    const type = f.constructor.name;
    const name = f.getName();
    const out = { name, type };
    try {
      if (type === 'PDFTextField') {
        out.value = f.getText() || '';
      } else if (type === 'PDFCheckBox') {
        out.checked = f.isChecked();
        const dict = f.acroField?.dict;
        if (dict) {
          try {
            const v = dict.get(PDFName.of('V'));
            const as = dict.get(PDFName.of('AS'));
            if (v != null) out.V = String(v);
            if (as != null) out.AS = decodeKey(String(as));
          } catch (_) {}
        }
      } else if (type === 'PDFDropdown') {
        const opts = f.getOptions?.() || [];
        const sel = f.getSelected?.();
        out.options = opts.map((o) => decodeKey(String(o)));
        out.selected = sel?.length ? sel.map((s) => decodeKey(String(s))) : [];
      }
    } catch (e) {
      out.error = e.message;
    }
    rows.push(out);
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const result = {
    source: path.basename(pdfPath),
    inspectedAt: new Date().toISOString(),
    totalFields: rows.length,
    fields: rows,
  };

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('Wrote', outPath, '(' + rows.length, 'fields)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
