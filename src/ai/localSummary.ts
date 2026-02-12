/**
 * AI Intake Summary: 2-sentence case summary.
 * Uses rules-based generation (no server). Optional WebLLM can be added later.
 */

import type { Answers } from '../form/types';
import {
  getBankAccountCount,
  getRealEstateCount,
  getVehicleCount,
  hasAnySelectedExceptNone,
  hasBankAccounts,
  hasRealEstate,
  hasVehicles,
  isJointFiling,
} from '../utils/logic';

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export type SummaryInput = {
  filing: string;
  urgency: string[];
  flagsCount: number;
  missingRequiredCount: number;
  docs: Array<{ type: string; status: 'Missing' | 'Partial' | 'Received' | 'Waived'; files: number }>;
  assets: { properties: number; vehicles: number; bankAccounts: number; valuables: boolean };
  debts: { priority: boolean; secured: boolean; cosigned: boolean };
  income: { employed: boolean; otherIncome: boolean; docsMissing: boolean };
};

/** Build compact snapshot for summary (and optional LLM). */
export function buildSummaryInput(
  answers: Answers,
  uploads: Record<string, string[]>,
  missingCount: number,
  flagsCount: number,
  urgencyLabels: string[]
): SummaryInput {
  const docIds = [
    { id: 'upload_paystubs', label: 'Paystubs' },
    { id: 'upload_bank_statements', label: 'Bank statements' },
    { id: 'upload_tax_returns', label: 'Tax returns' },
    { id: 'upload_vehicle_docs', label: 'Vehicle docs' },
    { id: 'upload_mortgage_docs', label: 'Mortgage docs' },
    { id: 'upload_credit_report', label: 'Credit report' },
  ] as const;
  const docs = docIds.map((d) => {
    const files = uploads[d.id] ?? [];
    const waived = answers[`${d.id}_dont_have`] === 'Yes';
    if (waived) return { type: d.label, status: 'Waived' as const, files: 0 };
    if (files.length === 0) return { type: d.label, status: 'Missing' as const, files: 0 };
    if (d.id === 'upload_bank_statements' && files.length < 2) return { type: d.label, status: 'Partial' as const, files: files.length };
    return { type: d.label, status: 'Received' as const, files: files.length };
  });

  return {
    filing: isJointFiling(answers) ? 'Joint' : 'Single',
    urgency: urgencyLabels,
    flagsCount,
    missingRequiredCount: missingCount,
    docs,
    assets: {
      properties: hasRealEstate(answers) ? getRealEstateCount(answers) : 0,
      vehicles: hasVehicles(answers) ? getVehicleCount(answers) : 0,
      bankAccounts: hasBankAccounts(answers) ? getBankAccountCount(answers) : 0,
      valuables: hasAnySelectedExceptNone(answers, 'valuables', 'None of the above'),
    },
    debts: {
      priority: hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above'),
      secured: hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above'),
      cosigned: answers['cosigner_debts'] === 'Yes',
    },
    income: {
      employed: !isEmpty(answers['debtor_employer']) || !isEmpty(answers['debtor_gross_pay']),
      otherIncome: Array.isArray(answers['other_income_types']) && (answers['other_income_types'] as string[]).some((v) => v && v !== 'None of the above'),
      docsMissing: (uploads['upload_paystubs']?.length ?? 0) === 0 && answers['upload_paystubs_dont_have'] !== 'Yes',
    },
  };
}

/** Pick one of N options. Uses (seed * 31 + slot) so each generation gets a different pattern. */
function pick<T>(options: T[], seed: number, slot: number): T {
  const n = options.length;
  const index = Math.abs((seed * 31 + slot) % n);
  return options[index];
}

/** Generate exactly 2 concise sentences (rules-based). Optional seed for variation on regenerate. */
export function generateTwoSentenceSummary(input: SummaryInput, variationSeed?: number): string {
  const seed = variationSeed ?? 0;
  const filing = input.filing === 'Joint'
    ? pick(['Joint filer', 'Filing jointly'], seed, 0)
    : pick(['Single filer', 'Individual filer'], seed, 1);
  const emp = input.income.employed
    ? pick(['Employed', 'Employment reported'], seed, 2)
    : pick(['Unemployed or not reported', 'Not employed / not reported'], seed, 3);
  const assetParts: string[] = [];
  if (input.assets.properties > 0) assetParts.push(`${input.assets.properties} home${input.assets.properties > 1 ? 's' : ''}`);
  if (input.assets.vehicles > 0) assetParts.push(`${input.assets.vehicles} vehicle${input.assets.vehicles > 1 ? 's' : ''}`);
  if (input.assets.bankAccounts > 0) assetParts.push(`${input.assets.bankAccounts} bank account${input.assets.bankAccounts > 1 ? 's' : ''}`);
  const assetStr = assetParts.length > 0
    ? pick([assetParts.join(', '), `Assets: ${assetParts.join(', ')}`], seed, 4)
    : pick(['no real estate or vehicles', 'no real estate or vehicles reported'], seed, 5);
  const hasDebtMix = [input.debts.priority && 'priority', input.debts.secured && 'secured', input.debts.cosigned && 'co-signed'].filter(Boolean).length > 0;
  const debtStr = hasDebtMix
    ? pick(['Has priority, secured, and/or co-signed debts.', 'Priority, secured, or co-signed debt noted.'], seed, 6)
    : pick(['Unsecured debts reported.', 'Primarily unsecured debts.'], seed, 7);
  const urgencyStr = input.urgency.length > 0 ? ` Urgency: ${input.urgency.slice(0, 2).join('; ')}.` : '';
  const missingDocs = input.docs.filter((d) => d.status === 'Missing' || d.status === 'Partial').map((d) => d.type.toLowerCase());
  const missingStr = missingDocs.length > 0
    ? pick([` Missing: ${missingDocs.join(', ')}.`, ` Docs missing: ${missingDocs.join(', ')}.`], seed, 8)
    : '';
  const fallback = pick(['Income and expense data provided.', 'Income/expense info in intake.'], seed, 9);

  const sentence1 = `${filing}. ${emp}. Owns ${assetStr}.`;
  const sentence2 = `${debtStr}${urgencyStr}${missingStr}`.trim() || fallback;
  return `${sentence1} ${sentence2}`;
}
