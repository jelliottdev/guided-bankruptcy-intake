/**
 * Single source of PDF field names that fillScheduleAB sets.
 * Used by report script and by template-field assertion test.
 * Canonical list: docs/form-requirements/schedule-ab-fields-we-set.json
 */
import fs from 'node:fs';
import path from 'node:path';

const FIELDS_JSON_PATH = path.resolve(
  process.cwd(),
  'docs/form-requirements/schedule-ab-fields-we-set.json'
);

let _cachedSet: Set<string> | null = null;

/** All PDF field names that fillScheduleAB may set. */
export function getScheduleABPdfFieldsWeSet(): Set<string> {
  if (_cachedSet) return _cachedSet;
  const raw = fs.readFileSync(FIELDS_JSON_PATH, 'utf8');
  const arr = JSON.parse(raw) as string[];
  _cachedSet = new Set(arr);
  return _cachedSet;
}

/** Array form for report script compatibility. */
export function getScheduleABPdfFieldsWeSetArray(): string[] {
  return Array.from(getScheduleABPdfFieldsWeSet());
}
