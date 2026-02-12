import type { Answers, Flags } from '../form/types';
import { validateAll } from '../form/validate';

const DOCUMENT_IDS = ['upload_paystubs', 'upload_bank_statements', 'upload_tax_returns', 'upload_vehicle_docs', 'upload_mortgage_docs', 'upload_credit_report'] as const;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Client reliability score 0–100: higher = less hand-holding likely.
 * Based on: flags used, missing required, estimates vs exact, skipped docs.
 */
export function computeClientReliability(
  answers: Answers,
  _uploads: Record<string, string[]>,
  flags?: Flags
): { score: number; label: string; notes: string[] } {
  const errors = validateAll(answers, flags).filter((e) => e.severity !== 'warning');
  const missingCount = errors.length;

  let score = 100;
  const notes: string[] = [];

  // Flags: each active flag (with note) suggests client needs follow-up
  const flagCount = Object.values(flags ?? {}).filter((f) => f.flagged && (f.note ?? '').trim().length >= 10).length;
  if (flagCount > 0) {
    score -= Math.min(25, flagCount * 8);
    notes.push(`${flagCount} item(s) flagged "can't answer" — may need outreach`);
  }

  // Missing required
  if (missingCount > 0) {
    score -= Math.min(30, missingCount * 6);
    notes.push(`${missingCount} required field(s) missing`);
  }

  // Estimates / "Not sure"
  const estimateFields = [
    'property_1_value', 'property_2_value', 'property_3_value',
    'vehicle_1_details', 'vehicle_2_details', 'vehicle_3_details',
    'income_current_ytd', 'income_last_year', 'income_two_years_ago',
    'debtor_gross_pay', 'spouse_gross_pay',
  ];
  let estimateCount = 0;
  estimateFields.forEach((id) => {
    const v = answers[id];
    if (isEmpty(v)) return;
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    if (s.includes('not sure') || s === '?' || s === '') estimateCount += 1;
  });
  if (estimateCount > 2) {
    score -= Math.min(20, estimateCount * 4);
    notes.push('Several estimates or "Not sure" — verify key numbers');
  }

  // Skipped docs (waived)
  const waivedDocs = DOCUMENT_IDS.filter((id) => answers[`${id}_dont_have`] === 'Yes').length;
  if (waivedDocs > 0) {
    score -= Math.min(15, waivedDocs * 5);
    notes.push(`${waivedDocs} doc(s) marked "will provide later"`);
  }

  const clamped = Math.max(0, Math.min(100, score));
  let label: string;
  if (clamped >= 80) label = 'High — minimal follow-up expected';
  else if (clamped >= 60) label = 'Moderate — some follow-up likely';
  else if (clamped >= 40) label = 'Lower — plan for outreach';
  else label = 'Needs significant hand-holding';

  return { score: clamped, label, notes };
}
