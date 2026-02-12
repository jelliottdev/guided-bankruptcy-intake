/**
 * Attorney View dashboard: case status, AI summary, quick actions, health metrics,
 * action queue (blocks filing / important / follow-up), documents, schedules, financial signals.
 */
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { getVisibleSteps } from '../form/steps';
import type { FieldValue } from '../form/types';
import { validateAll } from '../form/validate';
import {
  getBankAccountCount,
  getRealEstateCount,
  getVehicleCount,
  getCaseStatus,
  getNextBestAction,
  hasAnySelectedExceptNone,
  hasBankAccounts,
  hasRealEstate,
  hasVehicles,
  isJointFiling,
} from '../utils/logic';
import { useIntake } from '../state/IntakeProvider';
import { computeCaseReadiness } from '../attorney/readiness';
import {
  getStrategySignals,
  getScheduleCoverage,
  getDocumentSufficiency,
  getFollowUpQuestions,
  getTimelineReadiness,
  generateFilingChecklist,
  generateClientDocRequest,
} from '../attorney/snapshot';
import { getPrimaryBlockers } from '../attorney/readiness';
import { buildCreditorMatrix, exportCreditorWorksheetFromRows, type CreditorRow } from '../attorney/creditorMatrix';
import { computeClientReliability } from '../attorney/clientReliability';
import {
  buildSummaryInput,
  generateTwoSentenceSummary,
} from '../ai/localSummary';

function formatDateForDisplay(value: unknown): string {
  if (value == null || (typeof value === 'string' && !value.trim())) return '(date unknown)';
  const s = typeof value === 'string' ? value.trim() : String(value);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '(date unknown)';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

const DOCUMENT_IDS = [
  { id: 'upload_paystubs', label: 'Paystubs' },
  { id: 'upload_bank_statements', label: 'Bank statements' },
  { id: 'upload_tax_returns', label: 'Tax returns' },
  { id: 'upload_vehicle_docs', label: 'Vehicle docs' },
  { id: 'upload_mortgage_docs', label: 'Mortgage docs' },
  { id: 'upload_credit_report', label: 'Credit report' },
] as const;

function isEmpty(value: FieldValue | undefined): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function lastSavedText(lastSavedAt: number | null): string {
  if (lastSavedAt == null) return 'Never';
  const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 120) return '1m ago';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

/** Urgency option value -> display label (short) */
const URGENCY_LABELS: Record<string, string> = {
  'Wage garnishment is currently active or pending': 'Active wage garnishment',
  'Bank account levy is pending': 'Bank account frozen or levy pending',
  'Foreclosure on your home is pending (date:)': 'Foreclosure sale scheduled',
  'Risk of vehicle repossession (date:)': 'Vehicle repossession risk',
  'Utility shutoff notice received (date:)': 'Utility shutoff notice received',
};

/** Short, scannable label for action items (no "is required" / long text). */
function shortActionLabel(fullLabel: string, _isEstimate: boolean): string {
  const s = fullLabel
    .replace(/\s+is required\.?$/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
  const words = s.split(/\s+/);
  if (words.length <= 4) return s;
  return words.slice(0, 4).join(' ');
}

/** Next Best Action: case-moving CTA for the top row */
type NextAction = {
  title: string;
  reason: string;
  severity: 'critical' | 'important' | 'followup';
  ctaLabel: string;
  onClick: () => void;
};

function buildNextBestActions(input: {
  missingRequiredCount: number;
  missingDocs: { key: string; label: string; need?: string }[];
  flaggedCount: number;
  scrollToActionQueue: () => void;
  scrollToFlags: () => void;
  copyText: (s: string) => void;
  docRequestMessage: string;
}): NextAction[] {
  const actions: NextAction[] = [];
  if (input.missingRequiredCount > 0) {
    actions.push({
      title: 'Request missing required answers',
      reason: `${input.missingRequiredCount} required fields are missing (blocks filing).`,
      severity: 'critical',
      ctaLabel: 'Open Action Queue',
      onClick: input.scrollToActionQueue,
    });
  }
  if (input.missingDocs.length > 0) {
    actions.push({
      title: 'Send document request to client',
      reason: `${input.missingDocs.length} document categories are missing.`,
      severity: 'important',
      ctaLabel: 'Copy doc request',
      onClick: () => input.copyText(input.docRequestMessage),
    });
  }
  if (input.flaggedCount > 0) {
    actions.push({
      title: 'Review client flags & notes',
      reason: `${input.flaggedCount} items were flagged by the client.`,
      severity: 'important',
      ctaLabel: 'Jump to Flags',
      onClick: input.scrollToFlags,
    });
  }
  return actions.slice(0, 3);
}

/** Case note for copy-to-notes: structured for attorney notes */
function formatCaseNote(summary: { posture: string; assets: string; debts: string; blockers: string[] }): string {
  return [
    `Case snapshot: ${summary.posture}.`,
    `Assets: ${summary.assets}. Debts: ${summary.debts}.`,
    summary.blockers.length ? `Blockers: ${summary.blockers.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}

/** Recommended next step from reliability breakdown */
function reliabilityNextStep(r: { missingRequired: number; docsMissing: number; flaggedAnswers: number }): string {
  if (r.missingRequired > 0) return 'Request missing required answers (blocks filing).';
  if (r.docsMissing > 0) return 'Request missing documents to confirm income/assets.';
  if (r.flaggedAnswers > 0) return 'Review client flags and resolve exceptions.';
  return 'Ready for attorney review.';
}

/** Attorney manual financial overlay (stored separately from client intake) */
export type AttorneyFinancialEntry = {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  unsecuredDebt?: number;
  securedDebt?: number;
  priorityDebt?: number;
  assetTotal?: number;
};

const ATTORNEY_FINANCIAL_KEY = 'gbi:attorney-financial';

function loadAttorneyFinancial(): AttorneyFinancialEntry {
  try {
    const raw = localStorage.getItem(ATTORNEY_FINANCIAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: AttorneyFinancialEntry = {};
    if (typeof parsed.monthlyIncome === 'number' && Number.isFinite(parsed.monthlyIncome)) out.monthlyIncome = parsed.monthlyIncome;
    if (typeof parsed.monthlyExpenses === 'number' && Number.isFinite(parsed.monthlyExpenses)) out.monthlyExpenses = parsed.monthlyExpenses;
    if (typeof parsed.unsecuredDebt === 'number' && Number.isFinite(parsed.unsecuredDebt)) out.unsecuredDebt = parsed.unsecuredDebt;
    if (typeof parsed.securedDebt === 'number' && Number.isFinite(parsed.securedDebt)) out.securedDebt = parsed.securedDebt;
    if (typeof parsed.priorityDebt === 'number' && Number.isFinite(parsed.priorityDebt)) out.priorityDebt = parsed.priorityDebt;
    if (typeof parsed.assetTotal === 'number' && Number.isFinite(parsed.assetTotal)) out.assetTotal = parsed.assetTotal;
    return out;
  } catch {
    return {};
  }
}

function saveAttorneyFinancial(entry: AttorneyFinancialEntry) {
  try {
    localStorage.setItem(ATTORNEY_FINANCIAL_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

/** Attorney-added creditor row (overlay on intake matrix) */
export type AttorneyCreditorEntry = {
  id: string;
  name: string;
  type: CreditorRow['type'];
  balanceOrNote?: string;
};

const ATTORNEY_CREDITOR_KEY = 'gbi:attorney-creditor-matrix';

function loadAttorneyCreditors(): AttorneyCreditorEntry[] {
  try {
    const raw = localStorage.getItem(ATTORNEY_CREDITOR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AttorneyCreditorEntry => {
      if (item == null || typeof item !== 'object') return false;
      const o = item as Record<string, unknown>;
      return typeof o.id === 'string' && typeof o.name === 'string' && typeof o.type === 'string' && ['Secured', 'Priority', 'Unsecured', 'Co-signed'].includes(o.type);
    }).map((o) => ({ id: o.id, name: String(o.name).trim() || o.name, type: o.type as CreditorRow['type'], balanceOrNote: typeof o.balanceOrNote === 'string' ? o.balanceOrNote : undefined }));
  } catch {
    return [];
  }
}

function saveAttorneyCreditors(list: AttorneyCreditorEntry[]) {
  try {
    localStorage.setItem(ATTORNEY_CREDITOR_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function parseCurrencyInput(value: string): number | undefined {
  const cleaned = value.replace(/[$,]/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n);
}

const ACTION_STATUS_KEY = 'gbi:action-status';

function loadActionStatus(): Record<string, 'open' | 'reviewed' | 'followup'> {
  try {
    const raw = localStorage.getItem(ACTION_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, 'open' | 'reviewed' | 'followup'> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'open' || v === 'reviewed' || v === 'followup') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveActionStatus(map: Record<string, 'open' | 'reviewed' | 'followup'>) {
  try {
    localStorage.setItem(ACTION_STATUS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Expandable doc row with need, examples, files, and Copy request */
function DocRow({
  doc,
  onCopyRequest,
}: {
  doc: { key: string; label: string; need: string; examples: string[]; files: { name: string; uploadedAt?: string }[] };
  onCopyRequest: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const missing = doc.files.length === 0;
  const requestText =
    `Please upload: ${doc.label}\n` +
    `Needed: ${doc.need}\n` +
    (doc.examples.length ? `Examples:\n${doc.examples.map((e) => `• ${e}`).join('\n')}\n` : '');
  return (
    <div className="doc-row">
      <div className="doc-row-head" onClick={() => setOpen((v) => !v)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}>
        <div className="doc-category">{doc.label}</div>
        <div className={`doc-status ${missing ? 'missing' : ''}`}>{missing ? 'Missing' : 'Received'}</div>
        <div className="doc-count">{doc.files.length} file(s)</div>
        <button type="button" className="btn btn-secondary btn-doc-copy" onClick={(e) => { e.stopPropagation(); onCopyRequest(requestText); }}>Copy request</button>
      </div>
      {open ? (
        <div className="doc-details">
          <div className="doc-need"><strong>Needed:</strong> {doc.need}</div>
          {doc.examples.length ? <ul className="doc-examples">{doc.examples.map((ex, i) => <li key={i}>{ex}</li>)}</ul> : null}
          {doc.files.length ? (
            <ul className="doc-filenames">{doc.files.map((f, i) => <li key={i}>{f.name}{f.uploadedAt ? ` — ${f.uploadedAt}` : ''}</li>)}</ul>
          ) : (
            <div className="doc-empty">No files uploaded yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export interface AttorneyDashboardProps {
  email?: string | null;
  phone?: string | null;
  onGoToWizard: (stepIndex: number, fieldId?: string) => void;
  onReset: () => void;
}

export function AttorneyDashboard({ email: _email, phone: _phone, onGoToWizard, onReset }: AttorneyDashboardProps) {
  const { state, setViewMode, setFlagResolved } = useIntake();
  const { answers, uploads, flags, lastSavedAt } = state;
  const [showDebug, setShowDebug] = useState(false);
  const [copyToast, setCopyToast] = useState<'Copied' | 'Copy failed' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionQueueOpen, setActionQueueOpen] = useState<Record<'critical' | 'important' | 'follow-up', boolean>>(() => ({
    critical: true,
    important: false,
    'follow-up': false,
  }));
  const [actionStatus, setActionStatus] = useState<Record<string, 'open' | 'reviewed' | 'followup'>>(loadActionStatus);
  const [attorneyFinancial, setAttorneyFinancial] = useState<AttorneyFinancialEntry>(loadAttorneyFinancial);
  const [financialEntryOpen, setFinancialEntryOpen] = useState(false);
  const [financialEntryDraft, setFinancialEntryDraft] = useState<AttorneyFinancialEntry>(() => loadAttorneyFinancial());
  const [attorneyCreditors, setAttorneyCreditors] = useState<AttorneyCreditorEntry[]>(loadAttorneyCreditors);
  const [creditorFormOpen, setCreditorFormOpen] = useState(false);
  const [creditorEditingId, setCreditorEditingId] = useState<string | null>(null);
  const [creditorDraft, setCreditorDraft] = useState<{ name: string; type: CreditorRow['type']; balanceOrNote: string }>({ name: '', type: 'Unsecured', balanceOrNote: '' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveFinancialEntry = useCallback(() => {
    setAttorneyFinancial(financialEntryDraft);
    saveAttorneyFinancial(financialEntryDraft);
    setFinancialEntryOpen(false);
  }, [financialEntryDraft]);
  const hasAnyFinancialEntry =
    attorneyFinancial.monthlyIncome != null ||
    attorneyFinancial.monthlyExpenses != null ||
    attorneyFinancial.unsecuredDebt != null ||
    attorneyFinancial.securedDebt != null ||
    attorneyFinancial.priorityDebt != null ||
    attorneyFinancial.assetTotal != null;
  const monthlyIncome = attorneyFinancial.monthlyIncome ?? 0;
  const monthlyExpenses = attorneyFinancial.monthlyExpenses ?? 0;
  const surplus = monthlyIncome - monthlyExpenses;
  const totalDebt =
    (attorneyFinancial.unsecuredDebt ?? 0) +
    (attorneyFinancial.securedDebt ?? 0) +
    (attorneyFinancial.priorityDebt ?? 0);
  const expenseRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
  const maxBar = Math.max(monthlyIncome, monthlyExpenses, 1);

  const scrollToActionQueue = useCallback(() => {
    document.getElementById('action-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const scrollToFlags = useCallback(() => {
    document.getElementById('client-flags')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const steps = useMemo(() => getVisibleSteps(answers), [answers]);
  const errors = useMemo(() => validateAll(answers, flags).filter((e) => e.severity !== 'warning'), [answers, flags]);

  const MIN_FLAG_NOTE = 10;
  const flaggedItems = useMemo(() => {
    const list: { fieldId: string; stepIndex: number; stepTitle: string; label: string; note: string }[] = [];
    Object.entries(flags).forEach(([fieldId, entry]) => {
      if (!entry.flagged || (entry.note ?? '').trim().length < MIN_FLAG_NOTE || entry.resolved) return;
      const stepIdx = steps.findIndex((s) => s.fields.some((f) => f.id === fieldId));
      if (stepIdx < 0) return;
      const step = steps[stepIdx];
      const field = step.fields.find((f) => f.id === fieldId);
      list.push({
        fieldId,
        stepIndex: stepIdx,
        stepTitle: step.title,
        label: field?.label ?? fieldId,
        note: (entry.note ?? '').trim(),
      });
    });
    return list.sort((a, b) => a.stepIndex !== b.stepIndex ? a.stepIndex - b.stepIndex : a.fieldId.localeCompare(b.fieldId));
  }, [flags, steps]);

  const kpis = useMemo(() => {
    let totalRequired = 0;
    let filledRequired = 0;
    for (const step of steps) {
      for (const field of step.fields) {
        if (field.required && (!field.showIf || field.showIf(answers))) {
          totalRequired += 1;
          if (!isEmpty(answers[field.id])) filledRequired += 1;
        }
      }
    }
    const completionPct = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 0;
    const missingCount = errors.length;
    const rawUrgency = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
    const displayUrgencyList = rawUrgency.filter((v) => v && !v.includes('None of'));
    const urgencyCount = displayUrgencyList.length;
    const docTotal = DOCUMENT_IDS.length;
    const docReceived = DOCUMENT_IDS.filter((d) => (uploads[d.id]?.length ?? 0) > 0).length;
    const docPct = docTotal > 0 ? Math.round((docReceived / docTotal) * 100) : 0;
    return {
      completionPct,
      completionText: `${filledRequired} / ${totalRequired}`,
      missingCount,
      urgencyCount,
      displayUrgencyList,
      docReceived,
      docTotal,
      docPct,
    };
  }, [answers, errors.length, steps, uploads]);

  const readiness = useMemo(
    () => computeCaseReadiness(answers, uploads, flags),
    [answers, uploads, flags]
  );
  const strategySignals = useMemo(() => getStrategySignals(answers), [answers]);
  const scheduleCoverage = useMemo(
    () => getScheduleCoverage(answers, uploads),
    [answers, uploads]
  );
  const documentSufficiency = useMemo(
    () => getDocumentSufficiency(answers, uploads),
    [answers, uploads]
  );
  const missingFieldLabels = useMemo(
    () => errors.map((e) => {
      const step = steps[e.stepIndex];
      const field = step?.fields.find((f) => f.id === e.fieldId);
      return field?.label ?? e.fieldId;
    }),
    [errors, steps]
  );
  const followUpQuestions = useMemo(
    () => getFollowUpQuestions(answers, uploads, missingFieldLabels),
    [answers, uploads, missingFieldLabels]
  );
  const timelineReadiness = useMemo(
    () => getTimelineReadiness(answers, uploads, kpis.missingCount, readiness.score),
    [answers, uploads, kpis.missingCount, readiness.score]
  );
  const clientReliability = useMemo(
    () => computeClientReliability(answers, uploads, flags),
    [answers, uploads, flags]
  );
  const creditorMatrix = useMemo(() => buildCreditorMatrix(answers), [answers]);
  const mergedCreditorMatrix = useMemo(() => [...creditorMatrix, ...attorneyCreditors.map((c) => ({ name: c.name, type: c.type, balanceOrNote: c.balanceOrNote }))], [creditorMatrix, attorneyCreditors]);
  const creditorCountByType = useMemo(() => {
    const m: Record<string, number> = { Secured: 0, Priority: 0, Unsecured: 0, 'Co-signed': 0 };
    mergedCreditorMatrix.forEach((r) => { m[r.type] = (m[r.type] ?? 0) + 1; });
    return m;
  }, [mergedCreditorMatrix]);
  const openAddCreditor = useCallback(() => {
    setCreditorDraft({ name: '', type: 'Unsecured', balanceOrNote: '' });
    setCreditorEditingId(null);
    setCreditorFormOpen(true);
  }, []);
  const openEditCreditor = useCallback((entry: AttorneyCreditorEntry) => {
    setCreditorDraft({ name: entry.name, type: entry.type, balanceOrNote: entry.balanceOrNote ?? '' });
    setCreditorEditingId(entry.id);
    setCreditorFormOpen(true);
  }, []);
  const saveCreditorDraft = useCallback(() => {
    const name = creditorDraft.name.trim();
    if (!name) return;
    if (creditorEditingId) {
      setAttorneyCreditors((list) => {
        const next = list.map((c) => (c.id === creditorEditingId ? { ...c, name, type: creditorDraft.type, balanceOrNote: creditorDraft.balanceOrNote.trim() || undefined } : c));
        saveAttorneyCreditors(next);
        return next;
      });
    } else {
      const id = `creditor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAttorneyCreditors((list) => {
        const next = [...list, { id, name, type: creditorDraft.type, balanceOrNote: creditorDraft.balanceOrNote.trim() || undefined }];
        saveAttorneyCreditors(next);
        return next;
      });
    }
    setCreditorFormOpen(false);
    setCreditorEditingId(null);
    setCreditorDraft({ name: '', type: 'Unsecured', balanceOrNote: '' });
  }, [creditorDraft, creditorEditingId]);
  const removeAttorneyCreditor = useCallback((id: string) => {
    setAttorneyCreditors((list) => {
      const next = list.filter((c) => c.id !== id);
      saveAttorneyCreditors(next);
      return next;
    });
  }, []);
  const cancelCreditorForm = useCallback(() => {
    setCreditorFormOpen(false);
    setCreditorEditingId(null);
    setCreditorDraft({ name: '', type: 'Unsecured', balanceOrNote: '' });
  }, []);
  const primaryBlockers = useMemo(
    () => getPrimaryBlockers(answers, uploads, missingFieldLabels),
    [answers, uploads, missingFieldLabels]
  );
  const filingChecklist = useMemo(
    () => generateFilingChecklist(answers, uploads, documentSufficiency, missingFieldLabels),
    [answers, uploads, documentSufficiency, missingFieldLabels]
  );
  const clientDocRequestText = useMemo(
    () => generateClientDocRequest(documentSufficiency),
    [documentSufficiency]
  );
  const docRequestMessage = useMemo(
    () =>
      clientDocRequestText +
      (clientDocRequestText.trim() ? '\n\nIf any item is unavailable, flag it in the intake and add a brief note explaining why.' : ''),
    [clientDocRequestText]
  );
  const missingDocsForNextAction = useMemo(
    () =>
      documentSufficiency
        .filter((d) => d.status === 'Missing' || d.status === 'Partial')
        .map((d) => ({ key: d.type, label: d.type, need: d.coverageRule !== '—' ? d.coverageRule : undefined })),
    [documentSufficiency]
  );
  const setItemStatus = useCallback((itemId: string, status: 'open' | 'reviewed' | 'followup') => {
    setActionStatus((prev) => {
      const current = prev[itemId];
      const next = { ...prev };
      if (current === status) {
        delete next[itemId];
      } else {
        next[itemId] = status;
      }
      saveActionStatus(next);
      return next;
    });
  }, []);

  const handleActionStatusChange = useCallback(
    (itemId: string, value: string, fieldId?: string) => {
      if (value === 'resolved' && fieldId) {
        setFlagResolved(fieldId, true);
        setItemStatus(itemId, 'reviewed');
      } else {
        if (fieldId) setFlagResolved(fieldId, false);
        setItemStatus(itemId, value as 'open' | 'reviewed' | 'followup');
      }
    },
    [setFlagResolved, setItemStatus]
  );

  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryCooldownRemaining, setAiSummaryCooldownRemaining] = useState(0);
  const aiSummaryGenerationCount = useRef(0);

  const generateAiSummary = useCallback(() => {
    aiSummaryGenerationCount.current += 1;
    const variationSeed = aiSummaryGenerationCount.current;
    const urgencyLabels = kpis.displayUrgencyList.map((v) => URGENCY_LABELS[v] ?? v);
    const input = buildSummaryInput(answers, uploads, kpis.missingCount, flaggedItems.length, urgencyLabels);
    setAiSummary(generateTwoSentenceSummary(input, variationSeed));
    setAiSummaryCooldownRemaining(10);
  }, [answers, uploads, kpis.missingCount, kpis.displayUrgencyList, flaggedItems.length]);

  useEffect(() => {
    if (aiSummaryCooldownRemaining <= 0) return;
    const t = setInterval(() => {
      setAiSummaryCooldownRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [aiSummaryCooldownRemaining]);

  const actionItems = useMemo(() => {
    const items: { shortLabel: string; stepIndex: number; stepTitle: string; fieldId?: string; isEstimate: boolean }[] = [];
    errors.forEach((e) => {
      const step = steps[e.stepIndex];
      const field = step?.fields.find((f) => f.id === e.fieldId);
      const fullLabel = field?.label ?? e.message.replace(/\s+is required\.?$/i, '').trim();
      const short = shortActionLabel(fullLabel, false);
      items.push({
        shortLabel: `${short} — missing`,
        stepIndex: e.stepIndex,
        stepTitle: step?.title ?? 'Other',
        fieldId: e.fieldId,
        isEstimate: false,
      });
    });
    const notSureFields = [
      { id: 'property_1_value', label: 'Property 1 value' },
      { id: 'property_2_value', label: 'Property 2 value' },
      { id: 'property_3_value', label: 'Property 3 value' },
      { id: 'vehicle_1_details', label: 'Vehicle 1 value' },
      { id: 'vehicle_2_details', label: 'Vehicle 2 value' },
      { id: 'vehicle_3_details', label: 'Vehicle 3 value' },
      { id: 'income_current_ytd', label: 'Income (current YTD)' },
      { id: 'income_last_year', label: 'Income (last year)' },
    ];
    notSureFields.forEach(({ id, label }) => {
      const v = answers[id];
      const stepIdx = steps.findIndex((st) => st.fields.some((f) => f.id === id));
      if (stepIdx < 0) return;
      const step = steps[stepIdx];
      const empty = isEmpty(v);
      const notSure = typeof v === 'string' && v.trim().toLowerCase().includes('not sure');
      if (empty || notSure) {
        items.push({
          shortLabel: `${shortActionLabel(label, true)} — needs estimate`,
          stepIndex: stepIdx,
          stepTitle: step?.title ?? 'Other',
          fieldId: id,
          isEstimate: true,
        });
      }
    });
    items.sort((a, b) => a.stepIndex !== b.stepIndex ? a.stepIndex - b.stepIndex : (a.fieldId ?? '').localeCompare(b.fieldId ?? ''));
    return items;
  }, [answers, errors, steps]);

  const urgencyWithDates = useMemo(() => {
    const list = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
    const result: { label: string; date?: string }[] = [];
    list.forEach((val) => {
      if (!val || val.includes('None of')) return;
      const label = URGENCY_LABELS[val] ?? val;
      if (val.includes('Foreclosure')) {
        const raw = answers['foreclosure_date'];
        result.push({ label, date: raw != null && String(raw).trim() ? formatDateForDisplay(raw) : '(date unknown)' });
      } else if (val.includes('vehicle repossession')) {
        const raw = answers['repossession_date'];
        result.push({ label, date: raw != null && String(raw).trim() ? formatDateForDisplay(raw) : '(date unknown)' });
      } else if (val.includes('Utility')) {
        const raw = answers['shutoff_date'];
        result.push({ label, date: raw != null && String(raw).trim() ? formatDateForDisplay(raw) : '(date unknown)' });
      } else result.push({ label });
    });
    return result;
  }, [answers]);

  const assetsSnapshot = useMemo(() => {
    const props = hasRealEstate(answers) ? getRealEstateCount(answers) : 0;
    const vehicles = hasVehicles(answers) ? getVehicleCount(answers) : 0;
    const banks = hasBankAccounts(answers) ? getBankAccountCount(answers) : 0;
    const valuables = hasAnySelectedExceptNone(answers, 'valuables', 'None of the above');
    return { properties: props, vehicles, bankAccounts: banks, valuables };
  }, [answers]);

  const debtsSnapshot = useMemo(() => {
    const priority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
    const otherSecured = hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above');
    const cosigned = answers['cosigner_debts'] === 'Yes';
    const unsecured = answers['unsecured_creditors'];
    const unsecuredText = typeof unsecured === 'string' && unsecured.trim() ? unsecured.trim().slice(0, 80) + (unsecured.length > 80 ? '…' : '') : null;
    return { priority, otherSecured, cosigned, unsecuredText };
  }, [answers]);

  const incomeSnapshot = useMemo(() => {
    const debtorEmployed = !isEmpty(answers['debtor_employer']) || !isEmpty(answers['debtor_gross_pay']);
    const spouseEmployed = isJointFiling(answers) && (!isEmpty(answers['spouse_employer']) || !isEmpty(answers['spouse_gross_pay']));
    const otherTypes = answers['other_income_types'];
    const otherList = Array.isArray(otherTypes) ? (otherTypes as string[]).filter((v) => v && v !== 'None of the above') : [];
    const incomeDocsUploaded = (uploads['income_uploads']?.length ?? 0) > 0;
    return { debtorEmployed, spouseEmployed, otherList, incomeDocsUploaded };
  }, [answers, uploads]);

  const caseNoteSummary = useMemo(
    () => ({
      posture: isJointFiling(answers) ? 'Joint filing' : 'Single filing',
      assets: `${assetsSnapshot.vehicles} vehicles, ${assetsSnapshot.properties > 0 ? `${assetsSnapshot.properties} real estate` : 'no real estate'}, ${assetsSnapshot.bankAccounts} bank accounts`,
      debts: debtsSnapshot.priority
        ? 'Priority'
        : debtsSnapshot.otherSecured
          ? 'Secured'
          : 'Unsecured' + (debtsSnapshot.cosigned ? '; co-signed' : ''),
      blockers: primaryBlockers,
    }),
    [answers, assetsSnapshot, debtsSnapshot, primaryBlockers]
  );
  const caseNoteText = useMemo(() => formatCaseNote(caseNoteSummary), [caseNoteSummary]);
  const reliabilityNextStepText = reliabilityNextStep(clientReliability.breakdown);

  const showToast = useCallback((message: 'Copied' | 'Copy failed') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setCopyToast(message);
    toastTimerRef.current = setTimeout(() => {
      setCopyToast(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  const copyToClipboard = useCallback((s: string) => {
    navigator.clipboard.writeText(s).then(() => showToast('Copied')).catch(() => showToast('Copy failed'));
  }, [showToast]);

  const caseStatus = useMemo(
    () =>
      getCaseStatus({
        missingRequired: kpis.missingCount,
        missingDocs: kpis.docTotal - kpis.docReceived,
        urgencyFlags: kpis.urgencyCount,
      }),
    [kpis.missingCount, kpis.docTotal, kpis.docReceived, kpis.urgencyCount]
  );

  const nextBestActionSingle = useMemo(
    () =>
      getNextBestAction({
        missingRequired: kpis.missingCount,
        missingDocs: missingDocsForNextAction.length,
        flaggedCount: flaggedItems.length + kpis.urgencyCount,
      }),
    [kpis.missingCount, missingDocsForNextAction.length, flaggedItems.length, kpis.urgencyCount]
  );

  const nextBestActions = useMemo(
    () =>
      buildNextBestActions({
        missingRequiredCount: kpis.missingCount,
        missingDocs: missingDocsForNextAction,
        flaggedCount: flaggedItems.length + kpis.urgencyCount,
        scrollToActionQueue,
        scrollToFlags,
        copyText: copyToClipboard,
        docRequestMessage,
      }),
    [
      kpis.missingCount,
      missingDocsForNextAction,
      flaggedItems.length,
      kpis.urgencyCount,
      scrollToActionQueue,
      scrollToFlags,
      copyToClipboard,
      docRequestMessage,
    ]
  );

  const copyExportBundle = useCallback(() => {
    try {
      const payload = { answers, uploads, exportedAt: new Date().toISOString() };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  }, [answers, uploads, showToast]);

  const copyCaseSnapshot = useCallback(() => {
    try {
      const snapshot = {
        answers,
        uploads,
        flags,
        exportedAt: new Date().toISOString(),
        meta: { missingRequired: kpis.missingCount, docsMissing: kpis.docTotal - kpis.docReceived },
      };
      navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  }, [answers, uploads, flags, kpis.missingCount, kpis.docTotal, kpis.docReceived, showToast]);

  const copyRawJson = useCallback(() => {
    try {
      const text = JSON.stringify({ answers, uploads }, null, 2);
      navigator.clipboard.writeText(text);
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  }, [answers, uploads, showToast]);

  const urgencyStepIndex = useMemo(() => steps.findIndex((s) => s.id === 'urgency'), [steps]);
  type AttentionRow =
    | { type: 'FLAG'; id: string; label: string; stepIndex: number; stepTitle: string; fieldId: string; note: string }
    | { type: 'URGENT'; id: string; label: string; date?: string; stepIndex: number; stepTitle: string }
    | { type: 'MISSING'; id: string; label: string; stepIndex: number; stepTitle: string; fieldId: string };
  const attentionRows = useMemo((): AttentionRow[] => {
    const seen = new Set<string>();
    const rows: AttentionRow[] = [];
    flaggedItems.forEach((item) => {
      const id = `flag-${item.fieldId}`;
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({
        type: 'FLAG',
        id,
        label: shortActionLabel(item.label, false),
        stepIndex: item.stepIndex,
        stepTitle: item.stepTitle,
        fieldId: item.fieldId,
        note: item.note.length > 50 ? item.note.slice(0, 47) + '…' : item.note,
      });
    });
    urgencyWithDates.forEach((u, i) => {
      rows.push({
        type: 'URGENT',
        id: `urgent-${i}`,
        label: u.label,
        date: u.date,
        stepIndex: urgencyStepIndex >= 0 ? urgencyStepIndex : 0,
        stepTitle: steps[urgencyStepIndex]?.title ?? 'Urgency',
      });
    });
    errors.forEach((e) => {
      const id = `missing-${e.stepIndex}-${e.fieldId}`;
      if (seen.has(id)) return;
      seen.add(id);
      const step = steps[e.stepIndex];
      const field = step?.fields.find((f) => f.id === e.fieldId);
      const label = field?.label ?? e.message.replace(/\s+is required\.?$/i, '').trim();
      rows.push({
        type: 'MISSING',
        id,
        label: shortActionLabel(label, false),
        stepIndex: e.stepIndex,
        stepTitle: step?.title ?? 'Other',
        fieldId: e.fieldId,
      });
    });
    return rows;
  }, [flaggedItems, urgencyWithDates, errors, steps, urgencyStepIndex]);

  type ActionQueueItem = {
    severity: 'critical' | 'important' | 'follow-up';
    label: string;
    reason: string;
    clientNote?: string;
    action: string;
    stepIndex: number;
    fieldId?: string;
  };
  const actionQueue = useMemo((): ActionQueueItem[] => {
    const seen = new Set<string>();
    const queue: ActionQueueItem[] = [];
    attentionRows.forEach((row) => {
      if (row.type === 'MISSING') {
        const key = `missing-${row.stepIndex}-${row.fieldId}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({
          severity: 'critical',
          label: row.label,
          reason: 'Required for petition',
          action: 'Request from client',
          stepIndex: row.stepIndex,
          fieldId: row.fieldId,
        });
      } else if (row.type === 'URGENT') {
        queue.push({
          severity: 'critical',
          label: row.label + (row.date ? ` (${row.date})` : ''),
          reason: 'Urgency',
          action: 'Review in intake',
          stepIndex: row.stepIndex,
        });
      } else if (row.type === 'FLAG') {
        const key = `flag-${row.fieldId}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({
          severity: 'important',
          label: row.label,
          reason: 'Client note',
          clientNote: row.note,
          action: 'Follow up or mark resolved',
          stepIndex: row.stepIndex,
          fieldId: row.fieldId,
        });
      }
    });
    actionItems.forEach((item) => {
      const key = `${item.stepIndex}-${item.fieldId ?? ''}`;
      if (seen.has(key)) return;
      if (item.isEstimate) {
        seen.add(key);
        queue.push({
          severity: 'important',
          label: item.shortLabel.replace(' — missing', '').replace(' — needs estimate', '').trim(),
          reason: 'Needs estimate',
          action: 'Verify value',
          stepIndex: item.stepIndex,
          fieldId: item.fieldId,
        });
      }
    });
    followUpQuestions.slice(0, 5).forEach((q) => {
      queue.push({
        severity: 'follow-up',
        label: q,
        reason: 'Clarify',
        action: 'Ask client',
        stepIndex: 0,
      });
    });
    return queue;
  }, [attentionRows, actionItems, followUpQuestions]);
  const actionQueueCritical = actionQueue.filter((a) => a.severity === 'critical');
  const actionQueueImportant = actionQueue.filter((a) => a.severity === 'important');
  const actionQueueFollowUp = actionQueue.filter((a) => a.severity === 'follow-up');

  const query = searchQuery.trim().toLowerCase();
  const filteredCritical = query
    ? actionQueueCritical.filter((a) => (a.label + ' ' + (a.reason ?? '')).toLowerCase().includes(query))
    : actionQueueCritical;
  const filteredImportant = query
    ? actionQueueImportant.filter((a) => (a.label + ' ' + (a.reason ?? '') + ' ' + (a.clientNote ?? '')).toLowerCase().includes(query))
    : actionQueueImportant;
  const filteredFollowUp = query
    ? actionQueueFollowUp.filter((a) => a.label.toLowerCase().includes(query))
    : actionQueueFollowUp;

  function actionItemId(item: (typeof actionQueue)[0], i: number, prefix: string): string {
    return `${prefix}-${item.stepIndex}-${item.fieldId ?? item.label.slice(0, 25).replace(/\s/g, '_')}-${i}`;
  }

  /** Items still shown in Blocks filing (not moved to follow-up) */
  const displayCritical = useMemo(
    () =>
      filteredCritical
        .map((item, i) => ({ item, i }))
        .filter(({ item, i }) => actionStatus[actionItemId(item, i, 'critical')] !== 'followup')
        .map(({ item, i }) => ({ item, i })),
    [filteredCritical, actionStatus]
  );
  /** Items still shown in Important (not moved to follow-up) */
  const displayImportant = useMemo(
    () =>
      filteredImportant
        .map((item, i) => ({ item, i }))
        .filter(({ item, i }) => actionStatus[actionItemId(item, i, 'important')] !== 'followup')
        .map(({ item, i }) => ({ item, i })),
    [filteredImportant, actionStatus]
  );
  /** Items moved to Follow-up from Critical (show in Follow-up section with "Move back to Blocks filing") */
  const movedToFollowUpFromCritical = useMemo(
    () =>
      filteredCritical
        .map((item, i) => ({ item, i }))
        .filter(({ item, i }) => actionStatus[actionItemId(item, i, 'critical')] === 'followup'),
    [filteredCritical, actionStatus]
  );
  /** Items moved to Follow-up from Important (show in Follow-up section with "Move back to Important") */
  const movedToFollowUpFromImportant = useMemo(
    () =>
      filteredImportant
        .map((item, i) => ({ item, i }))
        .filter(({ item, i }) => actionStatus[actionItemId(item, i, 'important')] === 'followup'),
    [filteredImportant, actionStatus]
  );
  /** Follow-up section: moved items first, then original follow-up items */
  const displayFollowUpMoved = useMemo(
    () => [
      ...movedToFollowUpFromCritical.map(({ item, i }) => ({ item, i, source: 'critical' as const })),
      ...movedToFollowUpFromImportant.map(({ item, i }) => ({ item, i, source: 'important' as const })),
    ],
    [movedToFollowUpFromCritical, movedToFollowUpFromImportant]
  );
  const displayFollowUpOriginal = filteredFollowUp.map((item, i) => ({ item, i }));

  const filteredDocs = query
    ? documentSufficiency.filter((d) => (d.type + ' ' + d.coverageRule).toLowerCase().includes(query))
    : documentSufficiency;

  const markedForFollowUpLabels = useMemo(
    () => displayFollowUpMoved.map(({ item }) => item.label),
    [displayFollowUpMoved]
  );

  const followUpCopyText = useMemo(
    () =>
      followUpQuestions.join('\n') +
      (markedForFollowUpLabels.length ? '\n\nMarked for follow-up:\n' + markedForFollowUpLabels.join('\n') : ''),
    [followUpQuestions, markedForFollowUpLabels]
  );

  const toggleActionQueueGroup = useCallback((key: 'critical' | 'important' | 'follow-up') => {
    setActionQueueOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const expandAllActionQueue = useCallback(() => {
    setActionQueueOpen({ critical: true, important: true, 'follow-up': true });
  }, []);
  const collapseAllActionQueue = useCallback(() => {
    setActionQueueOpen({ critical: false, important: false, 'follow-up': false });
  }, []);

  return (
    <div className="attorney-dashboard">
      <header className="attorney-header-bar">
        <div className="attorney-header-left">
          <h1 className="attorney-title">Attorney View</h1>
          <span className="attorney-subtitle">Case Intake Snapshot</span>
        </div>
        <div className="attorney-header-right">
          <span className="attorney-meta">{lastSavedText(lastSavedAt)}</span>
          <span className="header-action-group">
            <button type="button" className="btn-header btn-header-group" onClick={copyExportBundle} title="Copy answers + uploads JSON">Copy</button>
            <button type="button" className="btn-header btn-header-group btn-export-snapshot" onClick={copyCaseSnapshot} title="Copy full case snapshot (answers, uploads, flags) for export or backup">Export Case Snapshot</button>
            <button type="button" className="btn-header btn-header-group" onClick={onReset}>Reset</button>
          </span>
          <button type="button" className="btn-header modeToggle on" onClick={() => setViewMode('client')} aria-label="Toggle Client View">
            <span className="pill"><span className="knob" /></span>
            Client View
          </button>
          {copyToast && <span className={`attorney-toast ${copyToast === 'Copy failed' ? 'attorney-toast-error' : ''}`}>{copyToast}</span>}
        </div>
      </header>

      <div className="dashboard-header-grid">
        <div className="dashboard-card case-status-card" role="status" style={{ borderColor: caseStatus.color }}>
          <div className="dashboard-card-title">Case status</div>
          <div className="case-status-oneline" style={{ color: caseStatus.color }}>
            {caseStatus.label} — {readiness.score}% · {kpis.missingCount} missing · {kpis.docReceived}/{kpis.docTotal} docs
          </div>
          {primaryBlockers.length > 0 && (
            <div className="case-status-blockers-inline">{primaryBlockers.join(', ')}</div>
          )}
        </div>
        <div className="dashboard-card next-best-action-card">
          <div className="dashboard-card-title">Next best action</div>
          {nextBestActionSingle.action === 'openSummary' && nextBestActions.length === 0 ? (
            <p className="next-action-empty">No blocking actions. Review checklist or case note.</p>
          ) : (
            <>
              <div className="next-action-title">{nextBestActionSingle.title}</div>
              <div className="next-action-reason">
                {nextBestActionSingle.action === 'openActionQueue' && `${kpis.missingCount} required fields are missing (blocks filing).`}
                {nextBestActionSingle.action === 'copyDocRequest' && `${missingDocsForNextAction.length} document categories are missing.`}
                {nextBestActionSingle.action === 'openFlags' && `${flaggedItems.length + kpis.urgencyCount} items were flagged by the client.`}
                {nextBestActionSingle.action === 'openSummary' && 'Review intake and strategy signals.'}
              </div>
              <button
                type="button"
                className="btn-next-action-cta"
                onClick={
                  nextBestActionSingle.action === 'openActionQueue' ? scrollToActionQueue :
                  nextBestActionSingle.action === 'copyDocRequest' ? () => copyToClipboard(docRequestMessage) :
                  nextBestActionSingle.action === 'openFlags' ? scrollToFlags :
                  scrollToActionQueue
                }
              >
                {nextBestActionSingle.action === 'openActionQueue' ? 'Open Action Queue' :
                 nextBestActionSingle.action === 'copyDocRequest' ? 'Copy doc request' :
                 nextBestActionSingle.action === 'openFlags' ? 'Jump to Flags' : 'Open Action Queue'}
              </button>
            </>
          )}
        </div>
        <div className="dashboard-card ai-summary-card">
          <div className="dashboard-card-title">AI summary</div>
          {aiSummary ? (
            <>
              <p className="ai-summary-memo">{aiSummary}</p>
              <div className="ai-summary-actions-row">
                <button type="button" className="btn-ai-summary" onClick={() => copyToClipboard(caseNoteText)}>Copy to notes</button>
                <button
                  type="button"
                  className="btn-ai-summary"
                  onClick={generateAiSummary}
                  disabled={aiSummaryCooldownRemaining > 0}
                  title={aiSummaryCooldownRemaining > 0 ? `Available in ${aiSummaryCooldownRemaining}s` : 'Regenerate summary (available every 10s)'}
                >
                  {aiSummaryCooldownRemaining > 0 ? `Regenerate (${aiSummaryCooldownRemaining}s)` : 'Regenerate'}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn-ai-summary" onClick={generateAiSummary}>Generate summary</button>
          )}
        </div>
      </div>

      <div className="dashboard-health-row">
        <span className="health-tile"><strong>Completion</strong> {kpis.completionPct}%</span>
        <span className="health-tile"><strong>Required missing</strong> {kpis.missingCount}</span>
        <span className="health-tile"><strong>Docs missing</strong> {kpis.docTotal - kpis.docReceived}</span>
        <span className="health-tile"><strong>Flags</strong> {flaggedItems.length + kpis.urgencyCount}</span>
        <span className="health-tile"><strong>Reliability</strong> {clientReliability.score}</span>
      </div>

      <div className="dashboard-filterbar">
        <input
          type="search"
          className="dashboard-search"
          placeholder="Filter action queue and documents…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Filter"
        />
      </div>

      <div className="dashboard-split">
        <section id="action-queue" className="dashboard-panel action-queue-panel">
          <div className="dashboard-panel-title">Action Queue</div>
          {actionQueue.length > 0 && (
            <div className="action-queue-toolbar">
              <span className="action-queue-counts">
                {displayCritical.length > 0 && <span>{displayCritical.length} blocks filing</span>}
                {displayImportant.length > 0 && <span>{displayImportant.length} important</span>}
                {(displayFollowUpMoved.length + displayFollowUpOriginal.length) > 0 && (
                  <span>{displayFollowUpMoved.length + displayFollowUpOriginal.length} follow-up</span>
                )}
              </span>
              <span className="action-queue-toolbar-actions">
                <button type="button" className="btn-action-queue-toggle" onClick={() => copyToClipboard(followUpCopyText)} title="Includes suggested questions and items you marked for follow-up">Copy follow-up questions</button>
                <button type="button" className="btn-action-queue-toggle" onClick={expandAllActionQueue}>Expand all</button>
                <button type="button" className="btn-action-queue-toggle" onClick={collapseAllActionQueue}>Collapse all</button>
              </span>
            </div>
          )}
          {actionQueue.length === 0 ? (
            <div className="action-queue-empty">None</div>
          ) : (
            <div className="action-queue-groups">
              {displayCritical.length > 0 && (
                <div className="action-queue-group">
                  <button type="button" className={`action-queue-group-header ${actionQueueOpen.critical ? 'is-open' : ''}`} onClick={() => toggleActionQueueGroup('critical')} aria-expanded={actionQueueOpen.critical}>
                    <span className={`action-queue-chevron ${actionQueueOpen.critical ? 'is-open' : ''}`} aria-hidden />
                    <span className="action-queue-group-title">Blocks filing</span>
                    <span className="action-queue-group-count">{displayCritical.length}</span>
                  </button>
                  {actionQueueOpen.critical && (
                    <ul className="action-queue-rows">
                      {displayCritical.map(({ item, i }) => {
                        const id = actionItemId(item, i, 'critical');
                        const status = actionStatus[id];
                        return (
                          <li key={id} className="action-row">
                            <div className="action-row-main">
                              <div className="action-row-title">{item.label}</div>
                              <div className="action-row-sub">{item.reason} · {item.action}</div>
                            </div>
                            <div className="action-row-actions">
                              <button type="button" className="btn btn-secondary" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Jump to field</button>
                              <select
                                className="action-status-select"
                                value={status ?? 'open'}
                                onChange={(e) => setItemStatus(id, e.target.value as 'open' | 'reviewed' | 'followup')}
                                aria-label="Status"
                              >
                                <option value="open">Open</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="followup">Follow-up</option>
                              </select>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {displayImportant.length > 0 && (
                <div className="action-queue-group" id="client-flags">
                  <button type="button" className={`action-queue-group-header ${actionQueueOpen.important ? 'is-open' : ''}`} onClick={() => toggleActionQueueGroup('important')} aria-expanded={actionQueueOpen.important}>
                    <span className={`action-queue-chevron ${actionQueueOpen.important ? 'is-open' : ''}`} aria-hidden />
                    <span className="action-queue-group-title">Important</span>
                    <span className="action-queue-group-count">{displayImportant.length}</span>
                  </button>
                  {actionQueueOpen.important && (
                    <ul className="action-queue-rows">
                      {displayImportant.map(({ item, i }) => {
                        const id = actionItemId(item, i, 'important');
                        const status = actionStatus[id];
                        return (
                          <li key={id} className="action-row">
                            <div className="action-row-main">
                              <div className="action-row-title">{item.label}</div>
                              {item.clientNote && <div className="action-row-sub">&ldquo;{item.clientNote}&rdquo;</div>}
                              <div className="action-row-sub">{item.reason} · {item.action}</div>
                            </div>
                            <div className="action-row-actions">
                              <button type="button" className="btn btn-secondary" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Jump to field</button>
                              <select
                                className="action-status-select"
                                value={item.fieldId && flags[item.fieldId]?.resolved ? 'resolved' : (status ?? 'open')}
                                onChange={(e) => handleActionStatusChange(id, e.target.value, item.fieldId)}
                                aria-label="Status"
                              >
                                <option value="open">Open</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="followup">Follow-up</option>
                                {item.fieldId && <option value="resolved">Resolved</option>}
                              </select>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {(displayFollowUpMoved.length + displayFollowUpOriginal.length) > 0 && (
                <div className="action-queue-group">
                  <button type="button" className={`action-queue-group-header ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`} onClick={() => toggleActionQueueGroup('follow-up')} aria-expanded={actionQueueOpen['follow-up']}>
                    <span className={`action-queue-chevron ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`} aria-hidden />
                    <span className="action-queue-group-title">Follow-up</span>
                    <span className="action-queue-group-count">{displayFollowUpMoved.length + displayFollowUpOriginal.length}</span>
                  </button>
                  {actionQueueOpen['follow-up'] && (
                    <ul className="action-queue-rows">
                      {displayFollowUpMoved.map(({ item, i, source }) => {
                        const id = actionItemId(item, i, source);
                        return (
                          <li key={`moved-${id}`} className="action-row">
                            <div className="action-row-main">
                              <div className="action-row-title">{item.label}</div>
                              {item.clientNote && <div className="action-row-sub">&ldquo;{item.clientNote}&rdquo;</div>}
                              <div className="action-row-sub">{item.reason} · {item.action}</div>
                            </div>
                            <div className="action-row-actions">
                              <button type="button" className="btn btn-secondary" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Jump to field</button>
                              <select
                                className="action-status-select"
                                value={status ?? 'open'}
                                onChange={(e) => {
                                  const v = e.target.value as 'open' | 'reviewed' | 'followup';
                                  setItemStatus(id, v);
                                }}
                                aria-label="Status"
                              >
                                <option value="open">{source === 'critical' ? 'Move back to Blocks filing' : 'Move back to Important'}</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="followup">Follow-up</option>
                              </select>
                            </div>
                          </li>
                        );
                      })}
                      {displayFollowUpOriginal.map(({ item, i }) => {
                        const id = actionItemId(item, i, 'follow-up');
                        const status = actionStatus[id];
                        return (
                          <li key={id} className="action-row">
                            <div className="action-row-main">
                              <div className="action-row-title">{item.label}</div>
                              <div className="action-row-sub">{item.action}</div>
                            </div>
                            <div className="action-row-actions">
                              {item.fieldId ? <button type="button" className="btn btn-secondary" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Jump to field</button> : null}
                              <select
                                className="action-status-select"
                                value={status ?? 'open'}
                                onChange={(e) => setItemStatus(id, e.target.value as 'open' | 'reviewed' | 'followup')}
                                aria-label="Status"
                              >
                                <option value="open">Open</option>
                                <option value="reviewed">Reviewed</option>
                              </select>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="dashboard-right-panel">
          <div id="documents" className="dashboard-card doc-sufficiency-card">
            <div className="dashboard-card-title">Document sufficiency</div>
            <div className="doc-rows">
              {filteredDocs.map((d) => {
                const docId = DOCUMENT_IDS.find((x) => x.label === d.type)?.id ?? d.type;
                const files = (uploads[docId] ?? []).map((name) => ({ name }));
                const examples: string[] =
                  docId === 'upload_paystubs' ? ['Paystubs: last 60 days, all employers'] :
                  docId === 'upload_bank_statements' ? ['Bank statements: 2–3 months'] :
                  docId === 'upload_tax_returns' ? ['Tax returns: last 2 years'] : [];
                return (
                  <DocRow
                    key={d.type}
                    doc={{
                      key: docId,
                      label: d.type,
                      need: d.coverageRule,
                      examples,
                      files,
                    }}
                    onCopyRequest={(text) => copyToClipboard(text)}
                  />
                );
              })}
            </div>
          </div>
          <div className="dashboard-card schedules-checklist-card">
            <div className="dashboard-card-title">Schedules coverage</div>
            <ul className="schedules-checklist">
              {scheduleCoverage.map((row) => (
                <li key={row.schedule} className={`schedules-checklist-item schedule-${row.status.toLowerCase()}`}>
                  <span className="schedules-checklist-mark">{row.status === 'Ready' ? '✓' : '✗'}</span>
                  <span className="schedules-checklist-name">{row.schedule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="dashboard-analysis">
        <div className="dashboard-card financial-signals-card">
          <div className="financial-signals-header">
            <div className="dashboard-card-title">Financial signals</div>
            <button
              type="button"
              className="btn-financial-edit"
              onClick={() => {
                setFinancialEntryDraft({ ...attorneyFinancial });
                setFinancialEntryOpen((o) => !o);
              }}
            >
              {hasAnyFinancialEntry ? 'Edit numbers' : 'Add numbers'}
            </button>
          </div>
          <div className="financial-signals-grid">
            <div className="financial-signals-line">
              <span className="financial-signals-term">Assets</span>
              <span className="financial-signals-desc">{assetsSnapshot.vehicles} vehicles, {assetsSnapshot.properties > 0 ? `${assetsSnapshot.properties} real estate` : 'no real estate'}, {assetsSnapshot.bankAccounts} bank accounts</span>
            </div>
            <div className="financial-signals-line">
              <span className="financial-signals-term">Debts</span>
              <span className="financial-signals-desc">{debtsSnapshot.priority ? 'Priority' : ''}{debtsSnapshot.priority && debtsSnapshot.otherSecured ? ', ' : ''}{debtsSnapshot.otherSecured ? 'Secured' : ''}{!debtsSnapshot.priority && !debtsSnapshot.otherSecured ? 'Unsecured' : ''}{debtsSnapshot.cosigned ? '; co-signed' : ''}</span>
            </div>
            <div className="financial-signals-line">
              <span className="financial-signals-term">Income</span>
              <span className="financial-signals-desc">{incomeSnapshot.debtorEmployed ? 'Employed' : 'Not employed'}; docs {incomeSnapshot.incomeDocsUploaded ? 'received' : 'missing'}</span>
            </div>
          </div>
          {financialEntryOpen && (
            <div className="financial-entry-form">
              <div className="financial-entry-row">
                <label>Monthly income</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 4500"
                  value={financialEntryDraft.monthlyIncome != null ? String(financialEntryDraft.monthlyIncome) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, monthlyIncome: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-row">
                <label>Monthly expenses</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 3800"
                  value={financialEntryDraft.monthlyExpenses != null ? String(financialEntryDraft.monthlyExpenses) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, monthlyExpenses: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-row">
                <label>Unsecured debt</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 25000"
                  value={financialEntryDraft.unsecuredDebt != null ? String(financialEntryDraft.unsecuredDebt) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, unsecuredDebt: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-row">
                <label>Secured debt</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 150000"
                  value={financialEntryDraft.securedDebt != null ? String(financialEntryDraft.securedDebt) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, securedDebt: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-row">
                <label>Priority debt</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 5000"
                  value={financialEntryDraft.priorityDebt != null ? String(financialEntryDraft.priorityDebt) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, priorityDebt: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-row">
                <label>Total assets</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 12000"
                  value={financialEntryDraft.assetTotal != null ? String(financialEntryDraft.assetTotal) : ''}
                  onChange={(e) => setFinancialEntryDraft((d) => ({ ...d, assetTotal: parseCurrencyInput(e.target.value) }))}
                />
              </div>
              <div className="financial-entry-actions">
                <button type="button" className="btn-financial-save" onClick={saveFinancialEntry}>Save</button>
                <button type="button" className="btn-financial-cancel" onClick={() => setFinancialEntryOpen(false)}>Cancel</button>
              </div>
            </div>
          )}
          {hasAnyFinancialEntry && !financialEntryOpen && (
            <div className="financial-summary">
              <div className="financial-summary-tiles">
                <div className="financial-tile">
                  <span className="financial-tile-label">Income</span>
                  <span className="financial-tile-value">{formatCurrency(monthlyIncome)}</span>
                </div>
                <div className="financial-tile">
                  <span className="financial-tile-label">Expenses</span>
                  <span className="financial-tile-value">{formatCurrency(monthlyExpenses)}</span>
                </div>
                <div className={`financial-tile financial-tile-surplus ${surplus >= 0 ? 'positive' : 'negative'}`}>
                  <span className="financial-tile-label">{surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
                  <span className="financial-tile-value">{formatCurrency(Math.abs(surplus))}</span>
                </div>
                <div className="financial-tile">
                  <span className="financial-tile-label">Total debt</span>
                  <span className="financial-tile-value">{formatCurrency(totalDebt)}</span>
                </div>
                <div className="financial-tile">
                  <span className="financial-tile-label">Assets</span>
                  <span className="financial-tile-value">{formatCurrency(attorneyFinancial.assetTotal ?? 0)}</span>
                </div>
              </div>
              {(monthlyIncome > 0 || monthlyExpenses > 0) && (
                <div className="financial-bar-chart">
                  <div className="financial-bar-row">
                    <span className="financial-bar-label">Income</span>
                    <div className="financial-bar-track">
                      <div className="financial-bar-fill financial-bar-income" style={{ width: `${(monthlyIncome / maxBar) * 100}%` }} />
                    </div>
                    <span className="financial-bar-value">{formatCurrency(monthlyIncome)}</span>
                  </div>
                  <div className="financial-bar-row">
                    <span className="financial-bar-label">Expenses</span>
                    <div className="financial-bar-track">
                      <div className="financial-bar-fill financial-bar-expenses" style={{ width: `${(monthlyExpenses / maxBar) * 100}%` }} />
                    </div>
                    <span className="financial-bar-value">{formatCurrency(monthlyExpenses)}</span>
                  </div>
                </div>
              )}
              {monthlyIncome > 0 && (
                <div className="financial-calc-line">
                  <span className="financial-calc-label">Expense ratio</span>
                  <span
                    className="financial-calc-value"
                    style={{
                      color: expenseRatio / 100 > 0.9 ? 'var(--danger)' : expenseRatio / 100 > 0.75 ? 'var(--warn)' : 'var(--success)',
                    }}
                  >
                    {expenseRatio.toFixed(1)}% of income
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="dashboard-card filing-readiness-card">
          <div className="dashboard-card-title">Filing readiness</div>
          {primaryBlockers.length > 0 && <div className="filing-readiness-blockers"><strong>Blocks filing:</strong> {primaryBlockers.join(', ')}</div>}
          <div className="filing-readiness-schedules">
            {scheduleCoverage.filter((s) => s.status !== 'Ready').length > 0 && (
              <div className="filing-readiness-missing">Missing schedules: {scheduleCoverage.filter((s) => s.status !== 'Ready').map((s) => s.schedule).join(', ')}</div>
            )}
          </div>
          <div className="filing-readiness-timeline">~{timelineReadiness.days} — {timelineReadiness.note}</div>
          <button type="button" className="btn-generate-checklist" onClick={() => copyToClipboard([
            primaryBlockers.length ? `Blockers: ${primaryBlockers.join('; ')}` : '',
            `Documents: ${filingChecklist.clientMustProvide.length ? filingChecklist.clientMustProvide.join('; ') : 'None listed'}`,
            `Schedules missing: ${scheduleCoverage.filter((s) => s.status !== 'Ready').map((s) => s.schedule).join(', ') || 'None'}`,
            `Attorney confirm: ${filingChecklist.attorneyMustConfirm.join('; ') || 'None'}`,
            'Verify prior filings, pending lawsuits/garnishments, and recent transfers once docs arrive.',
          ].filter(Boolean).join('\n'))}>Copy filing checklist</button>
        </div>
      </div>

      {strategySignals.length > 0 && (
        <div className="dashboard-card strategy-signals-inline">
          <div className="dashboard-card-title">Strategy signals</div>
          <ul className="strategy-list-inline">
            {strategySignals.map((s) => (
              <li key={s.id}><span className="strategy-label">{s.label}</span>{s.note && <span className="strategy-note"> — {s.note}</span>}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="dashboard-footer-row">
        <div className="dashboard-card creditor-export-card">
          <div className="creditor-matrix-header">
            <div className="dashboard-card-title">Creditor matrix</div>
            <button type="button" className="btn-creditor-add" onClick={openAddCreditor}>Add creditor</button>
          </div>
          {mergedCreditorMatrix.length > 0 && (
            <div className="creditor-summary-tiles">
              <div className="creditor-tile">
                <span className="creditor-tile-label">Total</span>
                <span className="creditor-tile-value">{mergedCreditorMatrix.length}</span>
              </div>
              {(['Priority', 'Secured', 'Unsecured', 'Co-signed'] as const).map((t) => (creditorCountByType[t] ?? 0) > 0 && (
                <div key={t} className={`creditor-tile creditor-tile-${t.toLowerCase().replace('-', '').replace(' ', '')}`}>
                  <span className="creditor-tile-label">{t}</span>
                  <span className="creditor-tile-value">{creditorCountByType[t] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
          {creditorFormOpen && (
            <div className="creditor-entry-form">
              <input
                type="text"
                className="creditor-input-name"
                placeholder="Creditor name"
                value={creditorDraft.name}
                onChange={(e) => setCreditorDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <select
                className="creditor-input-type"
                value={creditorDraft.type}
                onChange={(e) => setCreditorDraft((d) => ({ ...d, type: e.target.value as CreditorRow['type'] }))}
              >
                <option value="Priority">Priority</option>
                <option value="Secured">Secured</option>
                <option value="Unsecured">Unsecured</option>
                <option value="Co-signed">Co-signed</option>
              </select>
              <input
                type="text"
                className="creditor-input-balance"
                placeholder="Balance or notes"
                value={creditorDraft.balanceOrNote}
                onChange={(e) => setCreditorDraft((d) => ({ ...d, balanceOrNote: e.target.value }))}
              />
              <div className="creditor-form-actions">
                <button type="button" className="btn-creditor-save" onClick={saveCreditorDraft}>{creditorEditingId ? 'Save' : 'Add'}</button>
                <button type="button" className="btn-creditor-cancel" onClick={cancelCreditorForm}>Cancel</button>
              </div>
            </div>
          )}
          {creditorMatrix.length > 0 && (
            <div className="creditor-matrix-section">
              <div className="creditor-section-label">From intake</div>
              <ul className="creditor-matrix-list compact">
                {creditorMatrix.slice(0, 8).map((row, i) => (
                  <li key={`intake-${i}`} className={`creditor-row type-${(row.type || '').toLowerCase().replace(' ', '-')}`}>
                    <span className="creditor-name">{row.name}</span>
                    <span className="creditor-type">{row.type}</span>
                    {row.balanceOrNote && <span className="creditor-balance">{row.balanceOrNote}</span>}
                  </li>
                ))}
              </ul>
              {creditorMatrix.length > 8 && <p className="muted-inline">+{creditorMatrix.length - 8} more</p>}
            </div>
          )}
          {attorneyCreditors.length > 0 && (
            <div className="creditor-matrix-section">
              <div className="creditor-section-label">Attorney-added</div>
              <ul className="creditor-matrix-list attorney-added">
                {attorneyCreditors.map((c) => (
                  <li key={c.id} className={`creditor-row type-${(c.type || '').toLowerCase().replace(' ', '-')}`}>
                    <span className="creditor-name">{c.name}</span>
                    <span className="creditor-type">{c.type}</span>
                    {c.balanceOrNote && <span className="creditor-balance">{c.balanceOrNote}</span>}
                    <span className="creditor-row-actions">
                      <button type="button" className="btn-creditor-inline" onClick={() => openEditCreditor(c)}>Edit</button>
                      <button type="button" className="btn-creditor-inline btn-creditor-remove" onClick={() => removeAttorneyCreditor(c.id)}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mergedCreditorMatrix.length === 0 && !creditorFormOpen && <p className="muted-inline">None yet. Add creditors above or complete intake.</p>}
          <button type="button" className="btn-quick-action" onClick={() => { const t = exportCreditorWorksheetFromRows(mergedCreditorMatrix); copyToClipboard(t); }}>Copy worksheet</button>
        </div>
        <div className="dashboard-card reliability-inline reliability-metric-card">
          <div className="dashboard-card-title">Client reliability</div>
          <div className="reliability-inline-score" title="Based on: required answers filled, document uploads, and client flags. Higher = less follow-up likely.">
            {clientReliability.score}
            <span className="reliability-tooltip" title="Based on: required answers filled, document uploads, and client flags. Higher = less follow-up likely." aria-label="Score formula: required answers, document uploads, flags">ⓘ</span>
          </div>
          <div className="reliability-inline-detail">{clientReliability.breakdown.missingRequired} missing, {clientReliability.breakdown.docsMissing} docs, {clientReliability.breakdown.flaggedAnswers} flagged</div>
          <div className="reliability-formula-hint">Based on: required answers, document uploads, flags</div>
          <div className="reliability-next-step">{reliabilityNextStepText}</div>
        </div>
      </div>

      <div className="attorney-card raw-section">
        <button
          type="button"
          className="raw-toggle"
          onClick={() => setShowDebug((v) => !v)}
          aria-expanded={showDebug}
        >
          {showDebug ? 'Hide developer/debug data' : 'Show developer/debug data'}
        </button>
        {showDebug && (
          <div className="raw-content">
            <button type="button" className="btn btn-secondary btn-copy-raw" onClick={copyRawJson} title="Copy raw JSON only">
              Copy
            </button>
            <pre className="raw-json">
              {JSON.stringify({ answers, uploads }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
