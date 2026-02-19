/**
 * Inspect B101 PDF template: list all AcroForm field names, types, and values/options.
 * Run: node scripts/inspect-b101-fields.mjs
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B101_PATH = path.join(__dirname, '..', 'public', 'forms', 'b101.pdf');

function getWidgetInfo(field) {
  const af = field.acroField;
  if (!af || !af.dict) return null;
  const dict = af.dict;
  const get = (name) => {
    try {
      const entry = dict.get(PDFName.of(name));
      return entry ? entry.toString() : null;
    } catch {
      return null;
    }
  };
  const getRef = (name) => {
    try {
      const entry = dict.get(PDFName.of(name));
      return entry ? entry : null;
    } catch {
      return null;
    }
  };
  const kids = getRef('Kids');
  const widgets = kids && kids.entries ? kids.entries() : [];
  const firstWidget = dict.get && dict.get(PDFName.of('Kids')) ? (dict.lookup ? dict : null) : dict;
  let V = null, AS = null, AP = null;
  try {
    V = dict.get(PDFName.of('V'));
    if (V) V = V.toString?.() ?? String(V);
  } catch (_) {}
  try {
    AS = dict.get(PDFName.of('AS'));
    if (AS) AS = AS.toString?.() ?? String(AS);
  } catch (_) {}
  try {
    AP = dict.get(PDFName.of('AP'));
  } catch (_) {}
  return { V, AS, AP, hasKids: !!kids };
}

async function inspect() {
  if (!fs.existsSync(B101_PATH)) {
    console.error('B101 template not found at:', B101_PATH);
    process.exit(1);
  }
  const buffer = fs.readFileSync(B101_PATH);
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const byType = {};
  const rows = [];

  for (const f of fields) {
    const type = f.constructor.name;
    const name = f.getName();
    byType[type] = (byType[type] || 0) + 1;

    let value = '';
    let extra = '';
    try {
      if (type === 'PDFTextField') {
        value = f.getText() || '(empty)';
      } else if (type === 'PDFCheckBox') {
        value = f.isChecked() ? 'checked' : 'unchecked';
        const af = f.acroField;
        if (af && af.dict) {
          const dict = af.dict;
          try {
            const v = dict.get(PDFName.of('V'));
            const as = dict.get(PDFName.of('AS'));
            if (v) extra = ` V=${String(v)}`;
            if (as) extra += ` AS=${String(as)}`;
          } catch (_) {}
        }
      } else if (type === 'PDFDropdown') {
        const opts = f.getOptions();
        value = f.getSelected ? (f.getSelected()?.join(', ') || '(none)') : '(options: ' + (opts?.length || 0) + ')';
        if (opts && opts.length <= 20) extra = ' [' + opts.join(', ') + ']';
      }
    } catch (e) {
      value = '(err: ' + e.message + ')';
    }
    rows.push({ name, type, value, extra });
  }

  console.log('=== B101 PDF Form Fields ===');
  console.log('Path:', B101_PATH);
  console.log('Total fields:', fields.length);
  console.log('By type:', byType);
  console.log('');

  console.log('--- All fields (name | type | value | extra) ---\n');
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const r of rows) {
    console.log(`${r.name}`);
    console.log(`  Type: ${r.type}  Value: ${r.value}${r.extra || ''}`);
  }

  console.log('\n--- Check box export values (AP/N keys; #20 = space) ---\n');
  const doc = pdfDoc;
  const decode = (s) => (s || '').replace(/#20/g, ' ').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  for (const f of fields) {
    if (f.constructor.name !== 'PDFCheckBox') continue;
    const name = f.getName();
    let exportVal = '';
    try {
      const d = f.acroField.dict;
      const ctx = d.context;
      const kids = d.get(PDFName.of('Kids'));
      if (kids && kids.get(0)) {
        const w = ctx.lookup(kids.get(0));
        const wdict = w.dict || w;
        const ap = wdict.get && wdict.get(PDFName.of('AP'));
        if (ap) {
          const n = ctx.lookup(ap).get(PDFName.of('N'));
          if (n) {
            const nRes = ctx.lookup(n);
            const keys = nRes.entries ? [...nRes.entries()].map(([k]) => decode(k.toString())) : [];
            exportVal = keys.join(' | ') || '(none)';
          }
        }
      }
    } catch (_) {}
    console.log(`${name}: ${exportVal || '(unable to read)'}`);
  }

  console.log('\n--- Field names containing "Check Box" (full list) ---\n');
  const allCb = rows.filter(r => r.name.includes('Check Box')).map(r => r.name);
  allCb.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb || a.localeCompare(b);
  });
  allCb.forEach(n => console.log(n));

  console.log('\n--- Date / signature related ---\n');
  rows.filter(r => /date|signed|executed|signature/i.test(r.name)).forEach(r => {
    console.log(`${r.name}  (${r.type})  ${r.value}`);
  });
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
