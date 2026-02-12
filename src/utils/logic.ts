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
