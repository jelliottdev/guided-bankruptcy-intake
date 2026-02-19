#!/usr/bin/env node
/**
 * Dump every form field in form_b106ab.pdf with name, type, and widget rectangle
 * (and page index when available). Use output to build docs/form-fields/form_b106ab-manifest.json
 * by assigning meaning/logicalId from visual layout.
 *
 * Usage: node scripts/inspect-schedule-ab-fields-with-position.mjs
 * Output: docs/form-fields/form_b106ab-with-positions.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'public', 'forms', 'form_b106ab.pdf');
const outPath = path.join(root, 'docs', 'form-fields', 'form_b106ab-with-positions.json');

const buf = fs.readFileSync(templatePath);
const doc = await PDFDocument.load(buf);
const form = doc.getForm();
const fields = form.getFields();

const entries = [];
for (const field of fields) {
  const name = field.getName();
  const type = field.constructor.name;
  const widgets = field.acroField?.getWidgets?.() ?? [];
  const rects = [];
  let pageIndex = null;
  for (const w of widgets) {
    const rect = w.getRectangle?.();
    if (rect) rects.push(rect);
    if (typeof doc.findPageForAnnotationRef === 'function' && w.ref) {
      const page = doc.findPageForAnnotationRef(w.ref);
      if (page) {
        const idx = doc.getPages().indexOf(page);
        if (idx >= 0) pageIndex = idx;
      }
    }
  }
  entries.push({
    pdfName: name,
    type,
    pageIndex: pageIndex ?? undefined,
    rects: rects.length ? rects : undefined,
  });
}

const out = {
  source: 'form_b106ab.pdf',
  inspectedAt: new Date().toISOString(),
  totalFields: entries.length,
  fields: entries,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${entries.length} field entries to ${outPath}`);
