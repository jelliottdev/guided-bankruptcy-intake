/**
 * Bankruptcy means test: median family income by state/household size, CMI calculation, pass/fail.
 * Data source: U.S. Trustee Program (cases filed on or after November 1, 2024).
 * Add $9,900 per person in excess of 4 for median income.
 */

import type { Answers } from '../form/types';
import { isJointFiling } from '../utils/logic';

/** Median annual income by state (and DC/territories) and family size. 1 earner, 2, 3, 4 people. */
const MEDIAN_INCOME_TABLE: Record<string, [number, number, number, number]> = {
  Alabama: [59045, 70558, 80892, 98855],
  Alaska: [74714, 96165, 107354, 123984],
  Arizona: [68887, 83027, 99961, 110040],
  Arkansas: [53203, 65409, 79150, 94059],
  California: [74007, 97073, 109312, 127096],
  Colorado: [80346, 102601, 118077, 142761],
  Connecticut: [79982, 99480, 122723, 155190],
  Delaware: [70718, 89537, 101386, 122075],
  'District of Columbia': [85663, 141171, 177438, 213223],
  Florida: [63916, 78785, 91290, 104626],
  Georgia: [60613, 78980, 95740, 111334],
  Hawaii: [79841, 94070, 113714, 133516],
  Idaho: [65732, 78779, 93883, 109634],
  Illinois: [67617, 86279, 105384, 128739],
  Indiana: [61711, 76626, 93279, 109564],
  Iowa: [61414, 82209, 97849, 112049],
  Kansas: [61551, 80399, 91268, 111876],
  Kentucky: [56109, 67384, 81771, 102919],
  Louisiana: [52139, 67303, 76364, 95232],
  Maine: [66976, 81328, 98453, 113766],
  Maryland: [80278, 105930, 124939, 149759],
  Massachusetts: [81040, 105425, 133692, 167173],
  Michigan: [62161, 76158, 95969, 117799],
  Minnesota: [71961, 92245, 119809, 140800],
  Mississippi: [51284, 63068, 75901, 86673],
  Missouri: [61375, 77306, 95758, 105861],
  Montana: [65175, 78743, 94941, 112592],
  Nebraska: [63421, 86576, 100397, 116876],
  Nevada: [65815, 81519, 93366, 103947],
  'New Hampshire': [84853, 98612, 134357, 146589],
  'New Jersey': [81843, 99955, 127415, 158437],
  'New Mexico': [52666, 69068, 74763, 90946],
  'New York': [66824, 86501, 105478, 130591],
  'North Carolina': [61789, 78014, 92035, 110533],
  'North Dakota': [71082, 89952, 110875, 133361],
  Ohio: [61148, 77214, 94173, 116462],
  Oklahoma: [57046, 71793, 82469, 94542],
  Oregon: [71243, 86378, 103758, 120252],
  Pennsylvania: [65737, 80864, 100881, 122151],
  'Rhode Island': [74189, 93444, 112856, 136909],
  'South Carolina': [59869, 75449, 87002, 100847],
  'South Dakota': [59274, 89820, 93257, 113040],
  Tennessee: [60176, 76008, 90131, 106705],
  Texas: [61630, 80658, 92658, 107547],
  Utah: [80215, 90038, 106460, 120630],
  Vermont: [74744, 91816, 115552, 138410],
  Virginia: [75202, 95030, 113939, 141414],
  Washington: [83033, 99852, 121292, 141177],
  'West Virginia': [55558, 63930, 76528, 93406],
  Wisconsin: [65536, 83439, 105864, 123078],
  Wyoming: [61596, 80551, 91968, 107435],
  Guam: [50975, 60950, 69455, 84049],
  'Northern Mariana Islands': [34231, 34231, 39826, 58576],
  'Puerto Rico': [29153, 29153, 34429, 48200],
  'Virgin Islands': [40445, 48609, 51827, 56782],
};

const ADDITIONAL_PERSON_AMOUNT = 9900;

function parseMoney(value: unknown): number {
  if (value == null) return 0;
  const s = typeof value === 'string' ? value.replace(/[$,]/g, '').trim() : String(value);
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Get median annual income for a state and household size.
 * Household size 1-4 use table; 5+ use 4-person + $9,900 per additional person.
 */
export function getMedianAnnualIncome(
  state: string,
  householdSize: number
): number | null {
  const key = state.trim();
  const row = MEDIAN_INCOME_TABLE[key];
  if (!row) return null;
  const size = Math.max(1, Math.min(householdSize, 4));
  const base = row[size - 1];
  if (householdSize <= 4) return base;
  return base + (householdSize - 4) * ADDITIONAL_PERSON_AMOUNT;
}

/**
 * Get list of state names for dropdowns.
 */
export function getMedianIncomeStates(): string[] {
  return Object.keys(MEDIAN_INCOME_TABLE).filter(
    (k) => !k.startsWith('Northern') && k !== 'Virgin Islands' && k !== 'Guam' && k !== 'Puerto Rico'
  );
}

export function getAllMedianIncomeStates(): string[] {
  return Object.keys(MEDIAN_INCOME_TABLE);
}

/**
 * Infer household size from answers: 1 if single filer, 2 if joint (debtor + spouse).
 * Optional: dependents could be added later.
 */
export function getHouseholdSizeFromAnswers(answers: Answers): number {
  return isJointFiling(answers) ? 2 : 1;
}

/**
 * Compute Current Monthly Income (CMI) from intake answers.
 * CMI = average monthly income over the 6 calendar months before filing.
 * We approximate using: monthly pay if available, else YTD/6.
 */
export function computeCMIFromAnswers(answers: Answers): number {
  const debtorPay = parseMoney(answers['debtor_gross_pay']);
  const spousePay = isJointFiling(answers) ? parseMoney(answers['spouse_gross_pay']) : 0;
  const ytd = parseMoney(answers['income_current_ytd']);

  const toMonthly = (amount: number, freqRaw: unknown): number => {
    if (amount <= 0) return 0;
    const freq = typeof freqRaw === 'string' ? freqRaw.toLowerCase() : '';
    if (freq.includes('weekly')) return amount * 4.333;
    if (freq.includes('bi-weekly') || freq.includes('biweekly')) return amount * 2.1667;
    if (freq.includes('semi-monthly') || freq.includes('semimonthly')) return amount * 2;
    if (freq.includes('monthly')) return amount;
    // Unknown frequency: treat entered value as monthly (best-effort)
    return amount;
  };

  if (debtorPay > 0 || spousePay > 0) {
    const debtorMonthly = toMonthly(debtorPay, answers['debtor_pay_frequency']);
    const spouseMonthly = isJointFiling(answers) ? toMonthly(spousePay, answers['spouse_pay_frequency']) : 0;
    return debtorMonthly + spouseMonthly;
  }
  if (ytd > 0) {
    return ytd / 6;
  }
  return 0;
}

export interface MeansTestResult {
  state: string;
  householdSize: number;
  medianAnnualIncome: number | null;
  medianMonthlyIncome: number | null;
  currentMonthlyIncome: number;
  annualizedCMI: number;
  pass: boolean | null;
  note: string;
}

/**
 * Run means test: compare CMI to median income for state/household size.
 * If state is missing or not in table, pass is null and note explains.
 */
export function runMeansTest(
  answers: Answers,
  stateOverride?: string
): MeansTestResult {
  const householdSize = getHouseholdSizeFromAnswers(answers);
  const state = (stateOverride || (answers['state'] as string) || '').trim();
  const medianAnnual = state ? getMedianAnnualIncome(state, householdSize) : null;
  const medianMonthly = medianAnnual != null ? medianAnnual / 12 : null;
  const cmi = computeCMIFromAnswers(answers);
  const annualizedCMI = cmi * 12;

  let pass: boolean | null = null;
  let note: string;

  if (!state) {
    note = 'Select state to run means test.';
  } else if (medianAnnual == null) {
    note = `State "${state}" not found in median income table.`;
  } else {
    pass = annualizedCMI <= medianAnnual;
    note = pass
      ? 'Household income is at or below median — presumption of abuse does not arise (first part of means test).'
      : 'Household income is above median — second part of means test (disposable income) may apply; consult Form 122A-2.';
  }

  return {
    state,
    householdSize,
    medianAnnualIncome: medianAnnual,
    medianMonthlyIncome: medianMonthly,
    currentMonthlyIncome: cmi,
    annualizedCMI,
    pass,
    note,
  };
}
