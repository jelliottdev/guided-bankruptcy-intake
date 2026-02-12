import type { Answers } from '../form/types';

const FILING_SETUP = 'filing_setup';
const REAL_ESTATE_OWNERSHIP = 'real_estate_ownership';
const REAL_ESTATE_COUNT = 'real_estate_count';
const BANK_ACCOUNTS = 'bank_accounts';
const BANK_ACCOUNT_COUNT = 'bank_account_count';
const SECURITY_DEPOSITS = 'security_deposits';
const VEHICLES = 'vehicles';
const VEHICLE_COUNT = 'vehicle_count';

export function isJointFiling(answers: Answers): boolean {
  return answers[FILING_SETUP] === 'Filing with spouse';
}

export function hasRealEstate(answers: Answers): boolean {
  return answers[REAL_ESTATE_OWNERSHIP] === 'Yes, I own real estate';
}

export function getRealEstateCount(answers: Answers): number {
  const v = answers[REAL_ESTATE_COUNT];
  if (v === '1' || v === '2' || v === '3') return Number(v);
  return 1;
}

export function hasBankAccounts(answers: Answers): boolean {
  return answers[BANK_ACCOUNTS] === 'Yes, I have bank accounts';
}

export function getBankAccountCount(answers: Answers): number {
  const v = answers[BANK_ACCOUNT_COUNT];
  if (v === '1' || v === '2' || v === '3') return Number(v);
  return 1;
}

export function hasSecurityDeposits(answers: Answers): boolean {
  return answers[SECURITY_DEPOSITS] === 'Yes, I have security deposits (e.g., rent, utilities)';
}

export function hasVehicles(answers: Answers): boolean {
  return answers[VEHICLES] === 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)';
}

export function getVehicleCount(answers: Answers): number {
  const v = answers[VEHICLE_COUNT];
  if (v === '1' || v === '2' || v === '3') return Number(v);
  return 1;
}

/** Checkbox group: true if user selected only "None of the above" (or no selection) */
export function isOnlyNoneSelected(answers: Answers, fieldId: string, noneValue: string): boolean {
  const val = answers[fieldId];
  if (!val || !Array.isArray(val)) return false;
  return val.length === 1 && val[0] === noneValue;
}

/** Checkbox group: true if any option other than "None" is selected */
export function hasAnySelectedExceptNone(answers: Answers, fieldId: string, noneValue: string): boolean {
  const val = answers[fieldId];
  if (!val || !Array.isArray(val)) return false;
  return val.length > 0 && !val.every((v) => v === noneValue);
}

export function getMailingDifferent(answers: Answers): boolean {
  return answers['mailing_different'] === 'Yes';
}

/** Case status derived from meta — single source of truth for label and color */
export function getCaseStatus(meta: {
  missingRequired: number;
  missingDocs: number;
  urgencyFlags: number;
}): { label: string; color: string } {
  if (meta.urgencyFlags > 0) {
    return { label: 'Urgent', color: 'var(--danger, #dc2626)' };
  }
  if (meta.missingRequired > 0 || meta.missingDocs > 0) {
    return { label: 'Not ready', color: 'var(--danger, #dc2626)' };
  }
  return { label: 'Ready to file', color: 'var(--success, #16a34a)' };
}

/** Next best action: single algorithmic priority for the dashboard */
export function getNextBestAction(meta: {
  missingRequired: number;
  missingDocs: number;
  flaggedCount: number;
}): { title: string; action: 'openActionQueue' | 'copyDocRequest' | 'openSummary' | 'openFlags' } {
  if (meta.missingRequired > 0) {
    return { title: 'Request missing required answers', action: 'openActionQueue' };
  }
  if (meta.missingDocs > 0) {
    return { title: 'Request missing documents', action: 'copyDocRequest' };
  }
  if (meta.flaggedCount > 0) {
    return { title: 'Review client flags & notes', action: 'openFlags' };
  }
  return { title: 'Review intake for strategy', action: 'openSummary' };
}
