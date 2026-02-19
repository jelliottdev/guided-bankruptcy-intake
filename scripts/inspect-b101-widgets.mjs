/**
 * Dump raw widget /AP (appearance) keys for B101 checkboxes to see export values.
 * Run: node scripts/inspect-b101-widgets.mjs
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B101_PATH = path.join(__dirname, '..', 'public', 'forms', 'b101.pdf');

function walkDict(dict, prefix = '', depth = 0) {
  if (depth > 4) return [];
  const lines = [];
  try {
    const entries = dict.entries ? dict.entries() : [];
    for (const [key, value] of entries) {
      const keyStr = key && key.toString ? key.toString() : String(key);
      let valStr = '';
      try {
        if (value && typeof value === 'object') {
          if (value.entries) {
            valStr = '<dict>';
            const sub = walkDict(value, prefix + '  ', depth + 1);
            lines.push(...sub.map(s => s));
          } else if (value.toString) {
            valStr = value.toString();
          }
        } else {
          valStr = String(value);
        }
      } catch (_) {
        valStr = '?';
      }
      if (!valStr.startsWith('<')) lines.push(prefix + keyStr + ' = ' + valStr);
    }
  } catch (e) {
    lines.push(prefix + 'error: ' + e.message);
  }
  return lines;
}

async function inspect() {
  const buffer = fs.readFileSync(B101_PATH);
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const targetNames = ['Check Box7', 'Check Box20', 'Check Box21', 'Check Box22', 'Check Box23'];
  console.log('=== Widget /AP and /V for selected checkboxes ===\n');

  for (const f of fields) {
    const name = f.getName();
    if (!targetNames.includes(name) || f.constructor.name !== 'PDFCheckBox') continue;
    const af = f.acroField;
    if (!af || !af.dict) {
      console.log(name, ': no acroField.dict\n');
      continue;
    }
    const dict = af.dict;
    console.log('---', name, '---');
    try {
      const v = dict.get(PDFName.of('V'));
      const as = dict.get(PDFName.of('AS'));
      console.log('  V:', v ? (v.toString ? v.toString() : String(v)) : '(none)');
      console.log('  AS:', as ? (as.toString ? as.toString() : String(as)) : '(none)');
      const ap = dict.get(PDFName.of('AP'));
      if (ap) {
        console.log('  AP:');
        try {
          const n = ap.get ? ap.get(PDFName.of('N')) : null;
          if (n && n.entries) {
            for (const [k, val] of n.entries()) {
            console.log('    N[' + (k.toString ? k.toString() : k) + ']');
            }
          }
        } catch (_) {}
      }
      const kids = dict.get(PDFName.of('Kids'));
      if (kids && kids.entries) {
        let idx = 0;
        for (const [k, kid] of kids.entries()) {
          if (kid && kid.get) {
            const kv = kid.get(PDFName.of('V'));
            const kas = kid.get(PDFName.of('AS'));
            const kap = kid.get(PDFName.of('AP'));
            console.log('  Kid', idx, 'V:', kv ? String(kv) : '-', 'AS:', kas ? String(kas) : '-');
            if (kap && kap.get) {
              const kn = kap.get(PDFName.of('N'));
              if (kn && kn.entries) {
                const keys = [];
                for (const [kk] of kn.entries()) keys.push(kk.toString ? kk.toString() : String(kk));
                console.log('       AP/N keys:', keys.join(', '));
              }
            }
            idx++;
          }
        }
      }
    } catch (e) {
      console.log('  Error:', e.message);
    }
    console.log('');
  }
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
