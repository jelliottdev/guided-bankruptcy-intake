#!/usr/bin/env node
/**
 * Lists all AcroForm field names and types from the B101 template PDF.
 * Run from repo root after starting dev server or with a local path to b101.pdf:
 *
 *   node scripts/list_b101_form_fields.mjs [path_to_b101.pdf]
 *
 * Default: public/forms/b101.pdf (relative to cwd)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const defaultPath = process.argv[2] || join(repoRoot, 'public/forms/b101.pdf');

async function main() {
  let buffer;
  try {
    buffer = readFileSync(defaultPath);
  } catch (e) {
    console.error('Failed to read PDF:', defaultPath, e.message);
    process.exit(1);
  }

  const doc = await PDFDocument.load(buffer);
  const form = doc.getForm();
  const fields = form.getFields();

  const byName = new Map();
  const byPage = new Map();

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name.replace('PDF', '').replace('Field', '').toLowerCase();
    byName.set(name, type);
    // pdf-lib doesn't expose page index on field; we just list all
  }

  console.log('B101 template form fields (name -> type)');
  console.log('Total:', byName.size);
  console.log('---');
  const sorted = [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, type] of sorted) {
    console.log(`${type.padEnd(10)}  ${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
