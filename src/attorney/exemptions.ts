/**
 * Bankruptcy exemption analysis: apply homestead, vehicle, and wildcard exemptions
 * to reported assets and flag non-exempt (at-risk) amounts.
 *
 * Amounts are approximate; federal figures are from 11 U.S.C. § 522 and are
 * adjusted periodically. State amounts vary and some states do not allow federal exemptions.
 */

import type { Answers } from '../form/types';
import {
  getRealEstateCount,
  getVehicleCount,
  getBankAccountCount,
  hasRealEstate,
  hasVehicles,
  hasBankAccounts,
} from '../utils/logic';

/** Federal exemption amounts (approximate; adjusted periodically). */
const FEDERAL_HOMESTEAD = 27_900;
const FEDERAL_VEHICLE = 4_650;
const FEDERAL_WILDCARD_BASE = 1_475;
const FEDERAL_WILDCARD_HOMESTEAD_UNUSED = 13_950;

function parseMoney(value: unknown): number {
  if (value == null) return 0;
  const s = typeof value === 'string' ? value.replace(/[$,]/g, '').trim() : String(value);
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export interface ExemptionSet {
  name: string;
  homestead: number;
  vehicle: number;
  wildcardBase: number;
  wildcardHomesteadUnused: number;
}

export const FEDERAL_EXEMPTIONS: ExemptionSet = {
  name: 'Federal',
  homestead: FEDERAL_HOMESTEAD,
  vehicle: FEDERAL_VEHICLE,
  wildcardBase: FEDERAL_WILDCARD_BASE,
  wildcardHomesteadUnused: FEDERAL_WILDCARD_HOMESTEAD_UNUSED,
};

/** Sample state exemptions (homestead / vehicle / wildcard). States that allow federal opt-in may use federal. */
const STATE_EXEMPTIONS: Record<string, Partial<ExemptionSet>> = {
  California: { name: 'California', homestead: 300_000, vehicle: 6_400, wildcardBase: 0, wildcardHomesteadUnused: 0 },
  Texas: { name: 'Texas', homestead: 0, vehicle: 0, wildcardBase: 0, wildcardHomesteadUnused: 0 }, // Texas has unlimited homestead (rural/urban limits)
  Florida: { name: 'Florida', homestead: 0, vehicle: 1_000, wildcardBase: 0, wildcardHomesteadUnused: 0 }, // FL unlimited homestead
  'New York': { name: 'New York', homestead: 185_825, vehicle: 4_825, wildcardBase: 1_175, wildcardHomesteadUnused: 11_975 },
  Ohio: { name: 'Ohio', homestead: 152_925, vehicle: 4_650, wildcardBase: 1_475, wildcardHomesteadUnused: 13_950 },
};

function getExemptionSet(stateOrFederal: 'federal' | string): ExemptionSet {
  if (stateOrFederal === 'federal') return FEDERAL_EXEMPTIONS;
  const state = STATE_EXEMPTIONS[stateOrFederal];
  if (state) {
    return {
      name: state.name ?? stateOrFederal,
      homestead: state.homestead ?? FEDERAL_HOMESTEAD,
      vehicle: state.vehicle ?? FEDERAL_VEHICLE,
      wildcardBase: state.wildcardBase ?? FEDERAL_WILDCARD_BASE,
      wildcardHomesteadUnused: state.wildcardHomesteadUnused ?? FEDERAL_WILDCARD_HOMESTEAD_UNUSED,
    };
  }
  return FEDERAL_EXEMPTIONS;
}

export interface AssetEntry {
  category: string;
  description: string;
  value: number;
  exemptAmount: number;
  nonExemptAmount: number;
  atRisk: boolean;
}

export interface ExemptionAnalysisResult {
  exemptionSet: ExemptionSet;
  assets: AssetEntry[];
  totalValue: number;
  totalExempt: number;
  totalNonExempt: number;
  atRiskCategories: string[];
}

/**
 * Run exemption analysis on intake answers using the given exemption set (federal or state).
 */
export function runExemptionAnalysis(
  answers: Answers,
  stateOrFederal: string
): ExemptionAnalysisResult {
  const set = getExemptionSet(stateOrFederal || 'federal');
  const assets: AssetEntry[] = [];
  let homesteadUsed = 0;

  if (hasRealEstate(answers)) {
    const n = getRealEstateCount(answers);
    for (let i = 1; i <= n; i++) {
      const val = parseMoney(answers[`property_${i}_value`]);
      const equity = val; // Simplified: no mortgage subtraction here
      const exempt = Math.min(equity, Math.max(0, set.homestead - homesteadUsed));
      homesteadUsed += exempt;
      const nonExempt = Math.max(0, equity - exempt);
      assets.push({
        category: 'Real estate',
        description: `Property ${i}`,
        value: equity,
        exemptAmount: exempt,
        nonExemptAmount: nonExempt,
        atRisk: nonExempt > 0,
      });
    }
  }

  if (hasVehicles(answers)) {
    const n = getVehicleCount(answers);
    const perVehicle = set.vehicle;
    for (let i = 1; i <= n; i++) {
      const val = parseMoney(answers[`vehicle_${i}_value`]) || parseMoney(answers[`vehicle_${i}_details`]);
      const exempt = Math.min(val, perVehicle);
      const nonExempt = Math.max(0, val - exempt);
      assets.push({
        category: 'Vehicle',
        description: `Vehicle ${i}`,
        value: val,
        exemptAmount: exempt,
        nonExemptAmount: nonExempt,
        atRisk: nonExempt > 0,
      });
    }
  }

  if (hasBankAccounts(answers)) {
    const n = getBankAccountCount(answers);
    let totalBank = 0;
    for (let i = 1; i <= n; i++) {
      totalBank += parseMoney(answers[`account_${i}_balance`]);
    }
    const wildcardAvailable =
      set.wildcardBase + Math.max(0, set.homestead - homesteadUsed);
    const exempt = Math.min(totalBank, wildcardAvailable);
    const nonExempt = Math.max(0, totalBank - exempt);
    if (totalBank > 0) {
      assets.push({
        category: 'Bank accounts',
        description: `${n} account(s)`,
        value: totalBank,
        exemptAmount: exempt,
        nonExemptAmount: nonExempt,
        atRisk: nonExempt > 0,
      });
    }
  }

  const householdProperty = answers['household_property'];
  if (householdProperty && typeof householdProperty === 'object') {
    let total = 0;
    for (const v of Object.values(householdProperty)) {
      const range = String(v).split('_');
      if (range.length >= 2) {
        const low = Number.parseFloat(range[0]) || 0;
        const high = Number.parseFloat(range[1]) || 0;
        total += (low + high) / 2;
      }
    }
    if (total > 0) {
      const wildcardRemaining =
        set.wildcardBase + Math.max(0, set.homestead - homesteadUsed) -
        assets.reduce((s, a) => s + (a.category === 'Bank accounts' ? a.exemptAmount : 0), 0);
      const exempt = Math.min(total, Math.max(0, wildcardRemaining));
      const nonExempt = Math.max(0, total - exempt);
      assets.push({
        category: 'Household property',
        description: 'Estimated',
        value: total,
        exemptAmount: exempt,
        nonExemptAmount: nonExempt,
        atRisk: nonExempt > 0,
      });
    }
  }

  const totalValue = assets.reduce((s, a) => s + a.value, 0);
  const totalExempt = assets.reduce((s, a) => s + a.exemptAmount, 0);
  const totalNonExempt = assets.reduce((s, a) => s + a.nonExemptAmount, 0);
  const atRiskCategories = assets.filter((a) => a.atRisk).map((a) => a.category);

  return {
    exemptionSet: set,
    assets,
    totalValue,
    totalExempt,
    totalNonExempt,
    atRiskCategories,
  };
}

export function getExemptionStateOptions(): string[] {
  return ['federal', ...Object.keys(STATE_EXEMPTIONS)];
}
