/**
 * Shared types, constants, and helpers for the attorney dashboard.
 */
import type { FieldValue } from '../../form/types';
import type { CreditorRow } from '../../attorney/creditorMatrix';

export const DOCUMENT_IDS = [
  { id: 'upload_paystubs', label: 'Paystubs' },
  { id: 'upload_bank_statements', label: 'Bank statements' },
  { id: 'upload_tax_returns', label: 'Tax returns' },
  { id: 'upload_vehicle_docs', label: 'Vehicle docs' },
  { id: 'upload_mortgage_docs', label: 'Mortgage docs' },
  { id: 'upload_credit_report', label: 'Credit report' },
  { id: 'upload_debt_counseling', label: 'Debt counseling certificate' },
  { id: 'upload_business_docs', label: 'Business docs (if self-employed)' },
] as const;

export const URGENCY_LABELS: Record<string, string> = {
  'Wage garnishment is currently active or pending': 'Active wage garnishment',
  'Bank account levy is pending': 'Bank account frozen or levy pending',
  'Foreclosure on your home is pending (date:)': 'Foreclosure sale scheduled',
  'Risk of vehicle repossession (date:)': 'Vehicle repossession risk',
  'Utility shutoff notice received (date:)': 'Utility shutoff notice received',
};

export const ATTORNEY_FINANCIAL_KEY = 'gbi:attorney-financial';
export const ATTORNEY_CREDITOR_KEY = 'gbi:attorney-creditor-matrix';
export const ACTION_STATUS_KEY = 'gbi:action-status';

export type AttorneyFinancialEntry = {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  unsecuredDebt?: number;
  securedDebt?: number;
  priorityDebt?: number;
  assetTotal?: number;
};

export type AttorneyCreditorEntry = {
  id: string;
  name: string;
  type: CreditorRow['type'];
  balanceOrNote?: string;
};

export type ActionStatusValue = 'open' | 'reviewed' | 'followup';

export function isEmpty(value: FieldValue | undefined): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function lastSavedText(lastSavedAt: number | null): string {
  if (lastSavedAt == null) return 'Never';
  const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 120) return '1m ago';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function parseCurrencyInput(value: string): number | undefined {
  const cleaned = value.replace(/[$,]/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

export function shortActionLabel(fullLabel: string, _isEstimate: boolean): string {
  const s = fullLabel
    .replace(/\s+is required\.?$/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
  const words = s.split(/\s+/);
  if (words.length <= 4) return s;
  return words.slice(0, 4).join(' ');
}

export function loadAttorneyFinancial(): AttorneyFinancialEntry {
  try {
    const raw = localStorage.getItem(ATTORNEY_FINANCIAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: AttorneyFinancialEntry = {};
    if (typeof parsed.monthlyIncome === 'number' && Number.isFinite(parsed.monthlyIncome))
      out.monthlyIncome = parsed.monthlyIncome;
    if (typeof parsed.monthlyExpenses === 'number' && Number.isFinite(parsed.monthlyExpenses))
      out.monthlyExpenses = parsed.monthlyExpenses;
    if (typeof parsed.unsecuredDebt === 'number' && Number.isFinite(parsed.unsecuredDebt))
      out.unsecuredDebt = parsed.unsecuredDebt;
    if (typeof parsed.securedDebt === 'number' && Number.isFinite(parsed.securedDebt))
      out.securedDebt = parsed.securedDebt;
    if (typeof parsed.priorityDebt === 'number' && Number.isFinite(parsed.priorityDebt))
      out.priorityDebt = parsed.priorityDebt;
    if (typeof parsed.assetTotal === 'number' && Number.isFinite(parsed.assetTotal))
      out.assetTotal = parsed.assetTotal;
    return out;
  } catch {
    return {};
  }
}

export function saveAttorneyFinancial(entry: AttorneyFinancialEntry): void {
  try {
    localStorage.setItem(ATTORNEY_FINANCIAL_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

/** Seeded financial overlay for "Load demo data" — matches seed story so charts and means test show without manual entry. */
export function getSeededAttorneyFinancial(): AttorneyFinancialEntry {
  return {
    monthlyIncome: 8000,
    monthlyExpenses: 6500,
    securedDebt: 9800,
    priorityDebt: 3680,
    unsecuredDebt: 18900,
    assetTotal: 76000,
  };
}

export function loadAttorneyCreditors(): AttorneyCreditorEntry[] {
  try {
    const raw = localStorage.getItem(ATTORNEY_CREDITOR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is AttorneyCreditorEntry => {
        if (item == null || typeof item !== 'object') return false;
        const o = item as Record<string, unknown>;
        return (
          typeof o.id === 'string' &&
          typeof o.name === 'string' &&
          typeof o.type === 'string' &&
          ['Secured', 'Priority', 'Unsecured', 'Co-signed'].includes(o.type)
        );
      })
      .map((o) => ({
        id: o.id,
        name: String(o.name).trim() || o.name,
        type: o.type as CreditorRow['type'],
        balanceOrNote: typeof o.balanceOrNote === 'string' ? o.balanceOrNote : undefined,
      }));
  } catch {
    return [];
  }
}

export function saveAttorneyCreditors(list: AttorneyCreditorEntry[]): void {
  try {
    localStorage.setItem(ATTORNEY_CREDITOR_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function loadActionStatus(): Record<string, ActionStatusValue> {
  try {
    const raw = localStorage.getItem(ACTION_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, ActionStatusValue> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'open' || v === 'reviewed' || v === 'followup') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveActionStatus(map: Record<string, ActionStatusValue>): void {
  try {
    localStorage.setItem(ACTION_STATUS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function formatDateForDisplay(value: unknown): string {
  if (value == null || (typeof value === 'string' && !value.trim())) return '(date unknown)';
  const s = typeof value === 'string' ? value.trim() : String(value);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '(date unknown)';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}
