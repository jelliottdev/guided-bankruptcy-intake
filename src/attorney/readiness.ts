import type { Answers, Flags } from '../form/types';
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

const DOCUMENT_IDS = [
  'upload_paystubs',
  'upload_bank_statements',
  'upload_tax_returns',
  'upload_vehicle_docs',
  'upload_mortgage_docs',
  'upload_credit_report',
] as const;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** Weighted readiness: identity 20%, income+expenses 20%, assets 20%, debts 20%, documents 20% */
export function computeCaseReadiness(
  answers: Answers,
  uploads: Record<string, string[]>,
  _flags?: Flags
): { score: number; band: string; bandLabel: string } {
  // Identity (20%): debtor identity + contact + spouse if joint
  let identityTotal = 0;
  let identityFilled = 0;
  const identityFields = [
    'debtor_full_name',
    'debtor_ssn_last4',
    'debtor_dob',
    'debtor_phone',
    'debtor_email',
    'debtor_address',
    'county',
  ];
  identityFields.forEach((id) => {
    identityTotal += 1;
    if (!isEmpty(answers[id])) identityFilled += 1;
  });
  if (isJointFiling(answers)) {
    ['spouse_full_name', 'spouse_ssn_last4', 'spouse_dob', 'spouse_phone', 'spouse_email'].forEach((id) => {
      identityTotal += 1;
      if (!isEmpty(answers[id])) identityFilled += 1;
    });
  }
  const identityPct = identityTotal > 0 ? identityFilled / identityTotal : 1;

  // Income + expenses (20%)
  let incomeExpTotal = 0;
  let incomeExpFilled = 0;
  const incomeFields = ['debtor_employer', 'debtor_gross_pay', 'income_current_ytd', 'income_last_year'];
  incomeFields.forEach((id) => {
    incomeExpTotal += 1;
    if (!isEmpty(answers[id])) incomeExpFilled += 1;
  });
  if (answers['monthly_expenses'] && typeof answers['monthly_expenses'] === 'object') {
    const grid = answers['monthly_expenses'] as Record<string, string>;
    const keys = Object.keys(grid).filter((k) => grid[k]);
    incomeExpTotal += 5;
    incomeExpFilled += Math.min(5, keys.length);
  } else {
    incomeExpTotal += 5;
  }
  const incomeExpPct = incomeExpTotal > 0 ? incomeExpFilled / incomeExpTotal : 0.5;

  // Assets (20%): only count when asset questions have been answered
  const realEstateAnswered = !isEmpty(answers['real_estate_ownership']);
  const bankAccountsAnswered = !isEmpty(answers['bank_accounts']);
  const vehiclesAnswered = !isEmpty(answers['vehicles']);
  let assetsTotal = 0;
  let assetsFilled = 0;
  if (realEstateAnswered) {
    if (hasRealEstate(answers)) {
      const n = getRealEstateCount(answers);
      for (let i = 1; i <= n; i++) {
        assetsTotal += 2;
        if (!isEmpty(answers[`property_${i}_address`])) assetsFilled += 1;
        if (!isEmpty(answers[`property_${i}_value`])) assetsFilled += 1;
      }
    } else {
      assetsTotal += 2;
      assetsFilled += 2; // Answered "no" = done for this part
    }
  }
  if (bankAccountsAnswered) {
    if (hasBankAccounts(answers)) {
      const n = getBankAccountCount(answers);
      for (let i = 1; i <= n; i++) {
        assetsTotal += 2;
        if (!isEmpty(answers[`account_${i}_name`])) assetsFilled += 1;
        if (!isEmpty(answers[`account_${i}_balance`])) assetsFilled += 1;
      }
    } else {
      assetsTotal += 2;
      assetsFilled += 2;
    }
  }
  if (vehiclesAnswered) {
    if (hasVehicles(answers)) {
      const n = getVehicleCount(answers);
      for (let i = 1; i <= n; i++) {
        assetsTotal += 1;
        if (!isEmpty(answers[`vehicle_${i}_details`])) assetsFilled += 1;
      }
    } else {
      assetsTotal += 1;
      assetsFilled += 1;
    }
  }
  // Assets slice: 0% until at least one asset section is answered; then prorate by (filled/total) within answered sections
  const assetsPct = assetsTotal > 0 ? assetsFilled / assetsTotal : 0;

  // Debts (20%): each of 4 parts gets 0.25; only give credit when that part is actually "done"
  const priorityAnswered = Array.isArray(answers['priority_debts']) && (answers['priority_debts'] as string[]).length > 0;
  const securedAnswered = Array.isArray(answers['other_secured_debts']) && (answers['other_secured_debts'] as string[]).length > 0;
  const cosignerAnswered = !isEmpty(answers['cosigner_debts']);
  const hasUnsecured = !isEmpty(answers['unsecured_creditors']) || (uploads['upload_credit_report']?.length ?? 0) > 0;
  const hasPriority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
  const hasSecured = hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above');
  const priorityDone = priorityAnswered && (!hasPriority || !isEmpty(answers['priority_debts_details']));
  const securedDone = securedAnswered && (!hasSecured || !isEmpty(answers['other_secured_details']));
  const cosignerDone = cosignerAnswered && (answers['cosigner_debts'] !== 'Yes' || !isEmpty(answers['cosigner_details']));
  const unsecuredDone = hasUnsecured; // listed creditors or uploaded credit report
  const debtDone = (priorityDone ? 1 : 0) + (securedDone ? 1 : 0) + (cosignerDone ? 1 : 0) + (unsecuredDone ? 1 : 0);
  const debtsPct = debtDone / 4;

  // Documents (20%)
  const docTotal = DOCUMENT_IDS.length;
  const docReceived = DOCUMENT_IDS.filter((id) => (uploads[id]?.length ?? 0) > 0).length;
  const docsPct = docTotal > 0 ? docReceived / docTotal : 0;

  const score = Math.round(
    identityPct * 20 +
    incomeExpPct * 20 +
    assetsPct * 20 +
    debtsPct * 20 +
    docsPct * 20
  );
  const clamped = Math.min(100, Math.max(0, score));

  let band: string;
  let bandLabel: string;
  if (clamped >= 90) {
    band = 'ready';
    bandLabel = 'Ready for draft schedules';
  } else if (clamped >= 70) {
    band = 'minor';
    bandLabel = 'Needs minor follow-up';
  } else if (clamped >= 40) {
    band = 'gaps';
    bandLabel = 'Major gaps';
  } else {
    band = 'early';
    bandLabel = 'Early intake only';
  }

  return { score: clamped, band, bandLabel };
}
