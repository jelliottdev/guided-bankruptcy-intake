/**
 * List all kids and export values for multi-kid checkboxes (Check Box2, Check Box7, Check Box14, etc.)
 * Run: node scripts/inspect-b101-multikid.mjs
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B101_PATH = path.join(__dirname, '..', 'public', 'forms', 'b101.pdf');

function decode(s) {
  if (typeof s !== 'string') return String(s);
  return s.replace(/#20/g, ' ').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

async function run() {
  const buffer = fs.readFileSync(B101_PATH);
  const doc = await PDFDocument.load(buffer);
  const form = doc.getForm();
  const fields = form.getFields();

  const checkboxes = fields.filter((f) => f.constructor.name === 'PDFCheckBox');
  for (const f of checkboxes) {
    const name = f.getName();
    const dict = f.acroField?.dict;
    if (!dict?.get) continue;
    const kidsRef = dict.get(PDFName.of('Kids'));
    if (!kidsRef) continue;
    const ctx = dict.context;
    if (!ctx?.lookup) continue;
    const kids = ctx.lookup(kidsRef);
    if (!kids?.get) continue;
    const len = kids.size?.() ?? kids.entries?.()?.length ?? 0;
    if (len === 0) continue;
    console.log(`\n${name} (${len} kids):`);
    for (let i = 0; i < len; i++) {
      try {
        const kidRef = kids.get(i);
        const widget = ctx.lookup(kidRef);
        const wdict = widget?.dict ?? widget;
        if (!wdict?.get) continue;
        const ap = wdict.get(PDFName.of('AP'));
        if (!ap) continue;
        const nRes = ctx.lookup(ap)?.get?.(PDFName.of('N'));
        if (!nRes) continue;
        const keys = ctx.lookup(nRes);
        const entries = keys?.entries ? [...keys.entries()] : [];
        const keysDecoded = entries.map(([k]) => decode(k.toString()));
        console.log(`  kid ${i}: ${keysDecoded.join(' | ') || '(no keys)'}`);
      } catch (e) {
        console.log(`  kid ${i}: (error ${e.message})`);
      }
    }
  }
}

run().catch(console.error);
