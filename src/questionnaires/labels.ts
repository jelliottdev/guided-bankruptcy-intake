import type { FilingLabel } from './types';

export interface FilingLabelOption {
  id: FilingLabel;
  label: string;
  description: string;
  filingCritical: boolean;
}

export const FILING_LABEL_OPTIONS: readonly FilingLabelOption[] = [
  {
    id: 'identity_household',
    label: 'Identity / Household',
    description: 'Debtor, spouse, dependents, and residence facts.',
    filingCritical: true,
  },
  {
    id: 'income',
    label: 'Income',
    description: 'Wages, self-employment, and recurring income sources.',
    filingCritical: true,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Monthly household expenses and budget drivers.',
    filingCritical: true,
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Real estate, vehicles, accounts, and personal property.',
    filingCritical: true,
  },
  {
    id: 'debts_secured',
    label: 'Secured Debts',
    description: 'Mortgages, car loans, and liens tied to collateral.',
    filingCritical: true,
  },
  {
    id: 'debts_unsecured',
    label: 'Unsecured Debts',
    description: 'Credit cards, medical debt, and unsecured obligations.',
    filingCritical: true,
  },
  {
    id: 'schedule_a_b',
    label: 'Schedule A/B',
    description: 'Property schedules for real and personal assets.',
    filingCritical: true,
  },
  {
    id: 'schedule_c',
    label: 'Schedule C',
    description: 'Exemption elections and claimed protected property.',
    filingCritical: true,
  },
  {
    id: 'schedule_d',
    label: 'Schedule D',
    description: 'Secured creditors and collateral details.',
    filingCritical: true,
  },
  {
    id: 'schedule_e_f',
    label: 'Schedule E/F',
    description: 'Priority and unsecured creditor reporting.',
    filingCritical: true,
  },
  {
    id: 'schedule_i_j',
    label: 'Schedule I/J',
    description: 'Income and expense schedules.',
    filingCritical: true,
  },
  {
    id: 'sofa',
    label: 'SOFA',
    description: 'Statement of Financial Affairs questions.',
    filingCritical: true,
  },
  {
    id: 'exemptions',
    label: 'Exemptions',
    description: 'Exemption strategy and supporting facts.',
    filingCritical: true,
  },
  {
    id: 'legal_actions',
    label: 'Legal Actions',
    description: 'Urgent legal events, garnishments, foreclosures, suits.',
    filingCritical: true,
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Upload requests and sufficiency of documentary evidence.',
    filingCritical: true,
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Additional context outside standard filing schedules.',
    filingCritical: false,
  },
] as const;

export const FILING_LABEL_IDS = FILING_LABEL_OPTIONS.map((item) => item.id) as FilingLabel[];

export const FILING_CRITICAL_LABELS = FILING_LABEL_OPTIONS.filter((item) => item.filingCritical).map(
  (item) => item.id
) as FilingLabel[];

export function filingLabelText(id: FilingLabel): string {
  return FILING_LABEL_OPTIONS.find((item) => item.id === id)?.label ?? id;
}
