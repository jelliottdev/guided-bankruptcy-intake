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

const DOCUMENT_IDS = [
  { id: 'upload_paystubs', label: 'Paystubs' },
  { id: 'upload_bank_statements', label: 'Bank statements' },
  { id: 'upload_tax_returns', label: 'Tax returns' },
  { id: 'upload_vehicle_docs', label: 'Vehicle docs' },
  { id: 'upload_mortgage_docs', label: 'Mortgage docs' },
  { id: 'upload_credit_report', label: 'Credit report' },
  { id: 'upload_debt_counseling', label: 'Debt counseling' },
  { id: 'upload_business_docs', label: 'Business docs' },
] as const;

const URGENCY_LABELS: Record<string, string> = {
  'Wage garnishment is currently active or pending': 'Active wage garnishment',
  'Bank account levy is pending': 'Bank account frozen or levy pending',
  'Foreclosure on your home is pending (date:)': 'Foreclosure sale scheduled',
  'Risk of vehicle repossession (date:)': 'Vehicle repossession risk',
  'Utility shutoff notice received (date:)': 'Utility shutoff notice received',
};

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** Generate 2–3 sentence case summary from intake data */
export function generateCaseSummary(
  answers: Answers,
  uploads: Record<string, string[]>,
  missingCount: number,
  _flagsCount: number
): string {
  const filing = isJointFiling(answers) ? 'Joint filer' : 'Single filer';
  const employed = !isEmpty(answers['debtor_employer']) || !isEmpty(answers['debtor_gross_pay']);
  const employment = employed ? 'Employed.' : 'Not employed (or not reported).';
  const props = hasRealEstate(answers) ? getRealEstateCount(answers) : 0;
  const vehicles = hasVehicles(answers) ? getVehicleCount(answers) : 0;
  const assets: string[] = [];
  if (props > 0) assets.push(`${props} home${props > 1 ? 's' : ''}`);
  if (vehicles > 0) assets.push(`${vehicles} vehicle${vehicles > 1 ? 's' : ''}`);
  const hasSecured = hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above');
  const hasPriority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
  const cosigned = answers['cosigner_debts'] === 'Yes';
  let debtLine = 'Has secured and priority debts.';
  if (hasSecured && hasPriority) debtLine = 'Has secured and priority debts.';
  else if (hasPriority) debtLine = 'Has priority debts.';
  else if (hasSecured) debtLine = 'Has secured debts.';
  else debtLine = 'Debts reported (unsecured/secured/priority as indicated).';
  if (cosigned) debtLine += ' Co-signed debts reported.';
  else debtLine += ' No co-signed debts reported.';

  const rawUrgency = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
  const urgencyList = rawUrgency.filter((v) => v && !v.includes('None of'));
  const urgencyLine = urgencyList.length > 0
    ? `Urgency: ${urgencyList.map((v) => URGENCY_LABELS[v] ?? v).slice(0, 2).join('; ')}.`
    : 'No urgency flags.';

  const missing: string[] = [];
  if ((uploads['upload_paystubs']?.length ?? 0) === 0 && answers['upload_paystubs_dont_have'] !== 'Yes') missing.push('paystubs');
  if ((uploads['upload_tax_returns']?.length ?? 0) === 0 && answers['upload_tax_returns_dont_have'] !== 'Yes') missing.push('tax returns');
  if (missingCount > 0) missing.push('required fields');
  const missingLine = missing.length > 0 ? `Missing: ${missing.join(', ')}.` : '';

  const parts = [
    `${filing}. ${employment}`,
    assets.length > 0 ? `Owns ${assets.join(' and ')}.` : 'No real estate or vehicles reported.',
    debtLine,
    urgencyLine,
  ];
  if (missingLine) parts.push(missingLine);
  return parts.join(' ');
}

/** Strategy signals (not legal conclusions) */
export function getStrategySignals(answers: Answers): { id: string; label: string; note?: string }[] {
  const signals: { id: string; label: string; note?: string }[] = [];

  const incomeYtd = answers['income_current_ytd'];
  const incomeStr = typeof incomeYtd === 'string' ? incomeYtd.replace(/[,$\s]/g, '') : '';
  const incomeNum = Number.parseFloat(incomeStr);
  // Rough median income check (single ~$60k annualized; very approximate)
  const annualized = Number.isNaN(incomeNum) ? 0 : incomeNum * (12 / 6); // if YTD is 6 months
  if (annualized > 0 && annualized < 55000) {
    signals.push({
      id: 'ch7-candidate',
      label: 'Likely Chapter 7 candidate',
      note: 'Income below rough median (estimate; confirm with means test).',
    });
  }

  const vehicles = hasVehicles(answers) ? getVehicleCount(answers) : 0;
  if (vehicles >= 2) {
    signals.push({
      id: 'non-exempt-vehicles',
      label: 'Has non-exempt asset risk',
      note: 'Multiple vehicles — exemption limits may apply.',
    });
  }

  const hasPriority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
  if (hasPriority) {
    signals.push({
      id: 'priority-debts',
      label: 'Priority debts present',
      note: 'Tax/support/other priority — plan treatment.',
    });
  }

  const rawUrgency = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
  const hasLevy = rawUrgency.some((v) => v && v.includes('levy'));
  const hasGarnishment = rawUrgency.some((v) => v && v.includes('garnishment'));
  if (hasLevy || hasGarnishment) {
    signals.push({
      id: 'urgency-filing',
      label: 'Urgency filing likely needed',
      note: 'Active levy or garnishment reported.',
    });
  }

  return signals;
}

/** Schedule coverage: Ready / Missing */
export function getScheduleCoverage(
  answers: Answers,
  uploads: Record<string, string[]>
): { schedule: string; status: 'Ready' | 'Missing'; detail: string }[] {
  const coverage: { schedule: string; status: 'Ready' | 'Missing'; detail: string }[] = [];

  // Schedule A/B (Assets) — only Ready when asset questions are answered and any reported assets have values
  const realEstateAnswered = !isEmpty(answers['real_estate_ownership']);
  const bankAccountsAnswered = !isEmpty(answers['bank_accounts']);
  const vehiclesAnswered = !isEmpty(answers['vehicles']);
  const hasProps = hasRealEstate(answers);
  const propCount = hasProps ? getRealEstateCount(answers) : 0;
  let assetsReady = realEstateAnswered && bankAccountsAnswered && vehiclesAnswered;
  if (assetsReady && hasProps) {
    for (let i = 1; i <= propCount; i++) {
      if (isEmpty(answers[`property_${i}_address`]) || isEmpty(answers[`property_${i}_value`])) assetsReady = false;
    }
  }
  const bankCount = hasBankAccounts(answers) ? getBankAccountCount(answers) : 0;
  if (assetsReady && hasBankAccounts(answers)) {
    for (let i = 1; i <= bankCount; i++) {
      if (isEmpty(answers[`account_${i}_name`])) assetsReady = false;
    }
  }
  if (assetsReady && hasVehicles(answers)) {
    const vehicleCount = getVehicleCount(answers);
    for (let i = 1; i <= vehicleCount; i++) {
      if (isEmpty(answers[`vehicle_${i}_details`])) assetsReady = false;
    }
  }
  coverage.push({
    schedule: 'Schedule A/B (Assets)',
    status: assetsReady ? 'Ready' : 'Missing',
    detail: assetsReady ? 'Values and descriptions present' : !realEstateAnswered || !bankAccountsAnswered || !vehiclesAnswered ? 'Asset questions not yet answered' : 'Missing property or account values',
  });

  // Schedule D (Secured) — only Ready when the secured-debts question is answered (and details if any)
  const securedQuestionAnswered = Array.isArray(answers['other_secured_debts']) && (answers['other_secured_debts'] as string[]).length > 0;
  const hasSecured = hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above');
  const securedDetailsFilled = !hasSecured || !isEmpty(answers['other_secured_details']);
  const securedReady = securedQuestionAnswered && securedDetailsFilled;
  coverage.push({
    schedule: 'Schedule D (Secured)',
    status: securedReady ? 'Ready' : 'Missing',
    detail: securedReady ? 'Secured creditors/lenders noted' : !securedQuestionAnswered ? 'Secured-debts question not yet answered' : 'Missing secured debt details',
  });

  // Schedule E/F (Unsecured / Priority)
  const hasUnsecured = !isEmpty(answers['unsecured_creditors']) || (uploads['upload_credit_report']?.length ?? 0) > 0;
  const hasPriority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
  const priorityDetails = !hasPriority || !isEmpty(answers['priority_debts_details']);
  coverage.push({
    schedule: 'Schedule E/F (Unsecured/Priority)',
    status: (hasUnsecured || hasPriority) && priorityDetails ? 'Ready' : 'Missing',
    detail: hasUnsecured || hasPriority ? (priorityDetails ? 'Creditors listed' : 'Missing priority details') : 'No creditors yet',
  });

  // Schedule I (Income)
  const incomeDocs = (uploads['upload_paystubs']?.length ?? 0) > 0 || (uploads['income_uploads']?.length ?? 0) > 0;
  const incomeFilled = !isEmpty(answers['debtor_gross_pay']) && !isEmpty(answers['income_current_ytd']);
  coverage.push({
    schedule: 'Schedule I (Income)',
    status: incomeFilled && incomeDocs ? 'Ready' : 'Missing',
    detail: incomeDocs ? (incomeFilled ? 'Income and docs' : 'Missing income values') : 'Missing paystubs/docs',
  });

  // Schedule J (Expenses)
  const hasExpenses = answers['monthly_expenses'] && typeof answers['monthly_expenses'] === 'object';
  const expKeys = hasExpenses ? Object.keys(answers['monthly_expenses'] as Record<string, string>).filter((k) => (answers['monthly_expenses'] as Record<string, string>)[k]) : [];
  coverage.push({
    schedule: 'Schedule J (Expenses)',
    status: expKeys.length >= 3 ? 'Ready' : 'Missing',
    detail: expKeys.length >= 3 ? 'Expense categories filled' : 'Few expense values',
  });

  return coverage;
}

export type DocSufficiencyRow = {
  type: string;
  status: 'OK' | 'Partial' | 'Missing' | 'Waived';
  message: string;
  lastDetected: string | null;
  coverageRule: string;
};

/** Document sufficiency: per-doc status with last detected, coverage rule */
export function getDocumentSufficiency(
  answers: Answers,
  uploads: Record<string, string[]>
): DocSufficiencyRow[] {
  const COVERAGE_RULE: Record<string, string> = {
    upload_paystubs: 'Last 60 days',
    upload_bank_statements: '2–3 months',
    upload_tax_returns: 'Last 2 years',
    upload_vehicle_docs: 'Titles/registration (or lender statement)',
    upload_mortgage_docs: 'Latest mortgage statement',
    upload_credit_report: 'Full credit report (all bureaus if available)',
    upload_debt_counseling: 'Completion certificate',
    upload_business_docs: 'Business bank statements + P&L (last 3–6 months)',
  };
  const NEED_TEXT: Record<string, { missing: string; ok?: string }> = {
    upload_paystubs: { missing: 'Missing — need last 60 days', ok: 'OK — last 60 days' },
    upload_bank_statements: { missing: 'Missing — need 2–3 months', ok: 'OK — 2–3 months' },
    upload_tax_returns: { missing: 'Missing — last 2 years', ok: 'OK — last 2 years' },
    upload_vehicle_docs: { missing: 'Missing — titles/registration or lender statement' },
    upload_mortgage_docs: { missing: 'Missing — latest statement' },
    upload_credit_report: { missing: 'Missing — pull or upload report' },
    upload_debt_counseling: { missing: 'Missing — completion certificate' },
    upload_business_docs: { missing: 'Missing — business statements + P&L' },
  };

  return DOCUMENT_IDS.map((d) => {
    // Conditional docs: treat as not applicable when relevant scenario isn't present.
    if (d.id === 'upload_business_docs' && answers['self_employed'] !== 'Yes') {
      return {
        type: d.label,
        status: 'Waived',
        message: 'Not applicable (not self-employed)',
        lastDetected: null,
        coverageRule: COVERAGE_RULE[d.id] ?? '—',
      };
    }

    const files = uploads[d.id] ?? [];
    const waived = answers[`${d.id}_dont_have`] === 'Yes';
    let lastDetected: string | null = null;
    if (files.length > 0 && typeof files[0] === 'string') {
      const name = files[0];
      const match = name.match(/(\d{4})-(\d{2})/);
      if (match) lastDetected = `${match[1]}-${match[2]}`;
    }
    if (waived) {
      return {
        type: d.label,
        status: 'Waived',
        message: 'Waived by client',
        lastDetected: null,
        coverageRule: COVERAGE_RULE[d.id] ?? '—',
      };
    }
    if (files.length === 0) {
      const need = NEED_TEXT[d.id]?.missing ?? 'Missing';
      return {
        type: d.label,
        status: 'Missing',
        message: need,
        lastDetected: null,
        coverageRule: COVERAGE_RULE[d.id] ?? '—',
      };
    }
    if (d.id === 'upload_bank_statements' && files.length < 2) {
      return { type: d.label, status: 'Partial', message: `Only ${files.length} of 2–3 months`, lastDetected, coverageRule: '2–3 months' };
    }
    const okMsg = NEED_TEXT[d.id]?.ok ?? 'OK';
    return {
      type: d.label,
      status: 'OK',
      message: okMsg,
      lastDetected,
      coverageRule: COVERAGE_RULE[d.id] ?? '—',
    };
  });
}

/** Suggested follow-up questions from gaps */
export function getFollowUpQuestions(
  answers: Answers,
  uploads: Record<string, string[]>,
  missingFieldLabels: string[]
): string[] {
  const questions: string[] = [];
  if (hasBankAccounts(answers) && missingFieldLabels.some((l) => l.toLowerCase().includes('bank') || l.toLowerCase().includes('account'))) {
    questions.push('Ask about missing bank accounts');
  }
  if (hasVehicles(answers) && missingFieldLabels.some((l) => l.toLowerCase().includes('vehicle') || l.toLowerCase().includes('value'))) {
    questions.push('Confirm vehicle values');
  }
  if (answers['prior_bankruptcy'] === 'Yes' && missingFieldLabels.some((l) => l.toLowerCase().includes('prior'))) {
    questions.push('Verify prior bankruptcy details');
  }
  if (!isEmpty(answers['self_employed']) && answers['self_employed'] === 'Yes' && isEmpty(answers['business_name_type'])) {
    questions.push('Clarify business income');
  }
  if ((uploads['upload_paystubs']?.length ?? 0) === 0 && answers['upload_paystubs_dont_have'] !== 'Yes') {
    questions.push('Request paystubs (last 60 days)');
  }
  if ((uploads['upload_tax_returns']?.length ?? 0) === 0 && answers['upload_tax_returns_dont_have'] !== 'Yes') {
    questions.push('Request tax returns (last 2 years)');
  }
  missingFieldLabels.slice(0, 3).forEach((label) => {
    if (!questions.some((q) => q.toLowerCase().includes(label.slice(0, 15).toLowerCase()))) {
      questions.push(`Clarify: ${label.length > 40 ? label.slice(0, 37) + '…' : label}`);
    }
  });
  return [...new Set(questions)].slice(0, 8);
}

/** Timeline readiness estimate (days) */
export function getTimelineReadiness(
  answers: Answers,
  uploads: Record<string, string[]>,
  missingCount: number,
  readinessScore: number
): { days: string; note: string } {
  const urgencyList = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]).filter((v) => v && !v.includes('None of')) : [];
  const docMissing = DOCUMENT_IDS.filter((d) => {
    if (d.id === 'upload_business_docs' && answers['self_employed'] !== 'Yes') return false;
    return (uploads[d.id]?.length ?? 0) === 0 && answers[`${d.id}_dont_have`] !== 'Yes';
  }).length;

  if (missingCount > 5 || readinessScore < 40) {
    return { days: '2–3+ weeks', note: 'Major gaps and missing docs' };
  }
  if (urgencyList.length > 0 && docMissing <= 2 && missingCount <= 2) {
    return { days: '3–5 days', note: 'Urgency case — minor follow-up' };
  }
  if (docMissing > 2 || missingCount > 2) {
    return { days: '5–10 days', note: 'Missing docs and/or required fields' };
  }
  if (readinessScore >= 80) {
    return { days: '3–7 days', note: 'Near complete — quick review' };
  }
  return { days: '~7–14 days', note: 'Moderate follow-up needed' };
}

/** Auto-generated filing checklist: client must provide / attorney must confirm */
export function generateFilingChecklist(
  answers: Answers,
  _uploads: Record<string, string[]>,
  documentSufficiency: DocSufficiencyRow[],
  missingFieldLabels: string[]
): { clientMustProvide: string[]; attorneyMustConfirm: string[] } {
  const clientMustProvide: string[] = [];
  documentSufficiency.forEach((row) => {
    if (row.status === 'Missing' && row.coverageRule !== '—') {
      clientMustProvide.push(`${row.type}: ${row.coverageRule}`);
    }
    if (row.status === 'Partial' && row.message) {
      clientMustProvide.push(`${row.type} — ${row.message}`);
    }
  });
  const attorneyMustConfirm: string[] = [];
  if (missingFieldLabels.some((l) => l.toLowerCase().includes('vehicle') || l.toLowerCase().includes('value'))) {
    attorneyMustConfirm.push('Vehicle values');
  }
  if (answers['prior_bankruptcy'] === 'Yes' && missingFieldLabels.some((l) => l.toLowerCase().includes('prior'))) {
    attorneyMustConfirm.push('Prior bankruptcy filing date');
  }
  if (hasRealEstate(answers) && missingFieldLabels.some((l) => l.toLowerCase().includes('property') || l.toLowerCase().includes('value'))) {
    attorneyMustConfirm.push('Real property values');
  }
  if (missingFieldLabels.some((l) => l.toLowerCase().includes('bank') || l.toLowerCase().includes('balance'))) {
    attorneyMustConfirm.push('Bank balances');
  }
  missingFieldLabels.slice(0, 3).forEach((label) => {
    const short = label.length > 40 ? label.slice(0, 37) + '…' : label;
    if (!attorneyMustConfirm.some((a) => a.toLowerCase().includes(short.slice(0, 12).toLowerCase()))) {
      attorneyMustConfirm.push(short);
    }
  });
  return {
    clientMustProvide: [...new Set(clientMustProvide)],
    attorneyMustConfirm: [...new Set(attorneyMustConfirm)].slice(0, 8),
  };
}

/** Copyable client-facing document request (email/memo body). */
export function generateClientDocRequest(documentSufficiency: DocSufficiencyRow[]): string {
  const lines: string[] = [
    'Please upload the following documents:',
    '',
  ];
  documentSufficiency.forEach((row) => {
    if (row.status === 'Missing' && row.coverageRule !== '—') {
      lines.push(`- ${row.type} (${row.coverageRule})`);
    }
    if (row.status === 'Partial' && row.message) {
      lines.push(`- ${row.type} — ${row.message}`);
    }
  });
  if (lines.length === 2) {
    lines.push('None required at this time.');
  }
  return lines.join('\n');
}
