import { useMemo, useState, useCallback, useRef } from 'react';
import { getVisibleSteps } from '../form/steps';
import type { FieldValue } from '../form/types';
import { validateAll } from '../form/validate';
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
import { useIntake } from '../state/IntakeProvider';
import { computeCaseReadiness } from '../attorney/readiness';
import {
  getStrategySignals,
  getScheduleCoverage,
  getDocumentSufficiency,
  getFollowUpQuestions,
  getTimelineReadiness,
  generateFilingChecklist,
} from '../attorney/snapshot';
import { getPrimaryBlockers } from '../attorney/readiness';
import { buildCreditorMatrix, exportCreditorWorksheet } from '../attorney/creditorMatrix';
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

export interface AttorneyDashboardProps {
  email?: string | null;
  phone?: string | null;
  onGoToWizard: (stepIndex: number, fieldId?: string) => void;
  onReset: () => void;
}

export function AttorneyDashboard({ email: _email, phone: _phone, onGoToWizard, onReset }: AttorneyDashboardProps) {
  const { state, setViewMode, setFlagResolved } = useIntake();
  const { answers, uploads, flags, lastSavedAt } = state;
  const [rawOpen, setRawOpen] = useState(false);
  const [copyToast, setCopyToast] = useState<'Copied' | 'Copy failed' | null>(null);
  const [filingChecklistOpen, setFilingChecklistOpen] = useState(false);
  const [actionQueueOpen, setActionQueueOpen] = useState<Record<'critical' | 'important' | 'follow-up', boolean>>(() => ({
    critical: true,
    important: false,
    'follow-up': false,
  }));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const primaryBlockers = useMemo(
    () => getPrimaryBlockers(answers, uploads, missingFieldLabels),
    [answers, uploads, missingFieldLabels]
  );
  const filingChecklist = useMemo(
    () => generateFilingChecklist(answers, uploads, documentSufficiency, missingFieldLabels),
    [answers, uploads, documentSufficiency, missingFieldLabels]
  );

  const [aiSummary, setAiSummary] = useState('');
  const generateAiSummary = useCallback(() => {
    const urgencyLabels = kpis.displayUrgencyList.map((v) => URGENCY_LABELS[v] ?? v);
    const input = buildSummaryInput(answers, uploads, kpis.missingCount, flaggedItems.length, urgencyLabels);
    setAiSummary(generateTwoSentenceSummary(input));
  }, [answers, uploads, kpis.missingCount, kpis.displayUrgencyList, flaggedItems.length]);

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

  const showToast = useCallback((message: 'Copied' | 'Copy failed') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setCopyToast(message);
    toastTimerRef.current = setTimeout(() => {
      setCopyToast(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  const copyExportBundle = useCallback(() => {
    try {
      const payload = { answers, uploads, exportedAt: new Date().toISOString() };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  }, [answers, uploads, showToast]);

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

  // Group attention rows by step (section) for collapsible UI
  type ActionQueueItem = { severity: 'critical' | 'important' | 'follow-up'; label: string; stepIndex: number; fieldId?: string };
  const actionQueue = useMemo((): ActionQueueItem[] => {
    const seen = new Set<string>();
    const queue: ActionQueueItem[] = [];
    attentionRows.forEach((row) => {
      if (row.type === 'MISSING') {
        const key = `missing-${row.stepIndex}-${row.fieldId}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({ severity: 'critical', label: row.label, stepIndex: row.stepIndex, fieldId: row.fieldId });
      } else if (row.type === 'URGENT') {
        queue.push({ severity: 'critical', label: row.label + (row.date ? ` (${row.date})` : ''), stepIndex: row.stepIndex });
      } else if (row.type === 'FLAG') {
        const key = `flag-${row.fieldId}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({ severity: 'important', label: row.label + ' — client note', stepIndex: row.stepIndex, fieldId: row.fieldId });
      }
    });
    actionItems.forEach((item) => {
      const key = `${item.stepIndex}-${item.fieldId ?? ''}`;
      if (seen.has(key)) return;
      if (item.isEstimate) {
        seen.add(key);
        queue.push({ severity: 'important', label: item.shortLabel.replace(' — missing', ' — needs estimate'), stepIndex: item.stepIndex, fieldId: item.fieldId });
      }
    });
    followUpQuestions.slice(0, 5).forEach((q) => {
      queue.push({ severity: 'follow-up', label: q, stepIndex: 0 });
    });
    return queue;
  }, [attentionRows, actionItems, followUpQuestions]);
  const actionQueueCritical = actionQueue.filter((a) => a.severity === 'critical');
  const actionQueueImportant = actionQueue.filter((a) => a.severity === 'important');
  const actionQueueFollowUp = actionQueue.filter((a) => a.severity === 'follow-up');

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
            <button type="button" className="btn-header btn-header-group" onClick={copyExportBundle} title="Copy full export">Copy</button>
            <button type="button" className="btn-header btn-header-group" onClick={onReset}>Reset</button>
          </span>
          <button type="button" className="btn-header modeToggle on" onClick={() => setViewMode('client')} aria-label="Toggle Client View">
            <span className="pill"><span className="knob" /></span>
            Client View
          </button>
          {copyToast && <span className={`attorney-toast ${copyToast === 'Copy failed' ? 'attorney-toast-error' : ''}`}>{copyToast}</span>}
        </div>
      </header>

      <div className={`case-status-bar case-status-${readiness.band}`} role="status">
        <div className="case-status-heading">
          <span className="case-status-label">Case status</span>
          <span className="case-status-value">
            {readiness.band === 'ready' ? 'Ready to file' : readiness.band === 'minor' ? 'Close — minor follow-up' : readiness.band === 'gaps' ? 'Not ready — major gaps' : 'Not ready to file'}
          </span>
        </div>
        <div className="case-status-metrics">
          <span>Readiness: {readiness.score}%</span>
          <span>Missing: {kpis.missingCount} required</span>
          <span>Docs: {kpis.docReceived}/{kpis.docTotal}</span>
          <span>Risk flags: {flaggedItems.length + kpis.urgencyCount}</span>
        </div>
        {primaryBlockers.length > 0 && (
          <div className="case-status-blockers">
            Primary blockers: {primaryBlockers.join(', ')}
          </div>
        )}
      </div>

      <div className="ai-summary-top-box">
        <div className="ai-summary-top-header">AI case summary</div>
        {aiSummary ? (
          <p className="ai-summary-top-text">{aiSummary}</p>
        ) : (
          <button type="button" className="btn-generate-ai-inline" onClick={generateAiSummary}>Generate 2-sentence summary</button>
        )}
      </div>

      <div className="attorney-strategy-schedules-row">
        {strategySignals.length > 0 && (
          <div className="attorney-card strategy-signals-card">
            <h3 className="card-title">Strategy Signals</h3>
            <ul className="strategy-list">
              {strategySignals.map((s) => (
                <li key={s.id} className="strategy-item">
                  <span className="strategy-label">{s.label}</span>
                  {s.note && <span className="strategy-note">{s.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="attorney-card schedule-coverage-card">
          <h3 className="card-title">Schedules Coverage</h3>
          <ul className="schedule-list">
            {scheduleCoverage.map((row) => (
              <li key={row.schedule} className={`schedule-row schedule-${row.status.toLowerCase()}`}>
                <span className="schedule-name">{row.schedule}</span>
                <span className="schedule-status">{row.status}</span>
                <span className="schedule-detail">{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section id="action-queue" className="dashboard-section attorney-card action-queue-card">
        <div className="action-queue-header">
          <h3 className="card-title">Action Queue</h3>
          {actionQueue.length > 0 && (
            <div className="action-queue-summary">
              <span className="action-queue-counts">
                {actionQueueCritical.length > 0 && <span>{actionQueueCritical.length} critical</span>}
                {actionQueueImportant.length > 0 && <span>{actionQueueImportant.length} important</span>}
                {actionQueueFollowUp.length > 0 && <span>{actionQueueFollowUp.length} follow-up</span>}
              </span>
              <span className="action-queue-toggles">
                <button type="button" className="btn-action-queue-toggle" onClick={expandAllActionQueue}>Expand all</button>
                <button type="button" className="btn-action-queue-toggle" onClick={collapseAllActionQueue}>Collapse all</button>
              </span>
            </div>
          )}
        </div>
        {actionQueue.length === 0 ? (
          <div className="action-queue-empty">None</div>
        ) : (
          <div className="action-queue-groups">
            {actionQueueCritical.length > 0 && (
              <div className="action-queue-group">
                <button
                  type="button"
                  className={`action-queue-group-header ${actionQueueOpen.critical ? 'is-open' : ''}`}
                  onClick={() => toggleActionQueueGroup('critical')}
                  aria-expanded={actionQueueOpen.critical}
                >
                  <span className={`action-queue-chevron ${actionQueueOpen.critical ? 'is-open' : ''}`} aria-hidden />
                  <span className="action-queue-group-title">Critical (blocks filing)</span>
                  <span className="action-queue-group-count">{actionQueueCritical.length}</span>
                </button>
                {actionQueueOpen.critical && (
                  <ul className="action-queue-rows">
                    {actionQueueCritical.map((item, i) => (
                      <li key={`c-${i}`} className="action-queue-row">
                        <span className="action-queue-label">{item.label}</span>
                        <button type="button" className="btn-open btn-open-sm" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Open</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {actionQueueImportant.length > 0 && (
              <div className="action-queue-group">
                <button
                  type="button"
                  className={`action-queue-group-header ${actionQueueOpen.important ? 'is-open' : ''}`}
                  onClick={() => toggleActionQueueGroup('important')}
                  aria-expanded={actionQueueOpen.important}
                >
                  <span className={`action-queue-chevron ${actionQueueOpen.important ? 'is-open' : ''}`} aria-hidden />
                  <span className="action-queue-group-title">Important</span>
                  <span className="action-queue-group-count">{actionQueueImportant.length}</span>
                </button>
                {actionQueueOpen.important && (
                  <ul className="action-queue-rows">
                    {actionQueueImportant.map((item, i) => (
                      <li key={`i-${i}`} className="action-queue-row">
                        <span className="action-queue-label">{item.label}</span>
                        <span className="action-queue-actions">
                          <button type="button" className="btn-open btn-open-sm" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Open</button>
                          {item.fieldId && (
                            <button type="button" className="btn-state btn-state-sm" onClick={() => setFlagResolved(item.fieldId!, true)}>Resolved</button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {actionQueueFollowUp.length > 0 && (
              <div className="action-queue-group">
                <button
                  type="button"
                  className={`action-queue-group-header ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`}
                  onClick={() => toggleActionQueueGroup('follow-up')}
                  aria-expanded={actionQueueOpen['follow-up']}
                >
                  <span className={`action-queue-chevron ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`} aria-hidden />
                  <span className="action-queue-group-title">Follow-up</span>
                  <span className="action-queue-group-count">{actionQueueFollowUp.length}</span>
                </button>
                {actionQueueOpen['follow-up'] && (
                  <ul className="action-queue-rows">
                    {actionQueueFollowUp.map((item, i) => (
                      <li key={`f-${i}`} className="action-queue-row">
                        <span className="action-queue-label">{item.label}</span>
                        {item.fieldId ? (
                          <button type="button" className="btn-open btn-open-sm" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Open</button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="attorney-card financial-snapshot-card">
        <h3 className="card-title">Financial Snapshot</h3>
        <div className="financial-snapshot-grid">
          <div className="financial-snapshot-line">
            <span className="financial-snapshot-term">Assets</span>
            <span className="financial-snapshot-desc">
              {assetsSnapshot.vehicles} vehicle{assetsSnapshot.vehicles !== 1 ? 's' : ''}, {assetsSnapshot.properties > 0 ? `${assetsSnapshot.properties} real estate` : 'no real estate'}, {assetsSnapshot.bankAccounts} bank account{assetsSnapshot.bankAccounts !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="financial-snapshot-line">
            <span className="financial-snapshot-term">Debts</span>
            <span className="financial-snapshot-desc">
              {debtsSnapshot.priority ? 'Priority' : ''}{debtsSnapshot.priority && debtsSnapshot.otherSecured ? ', ' : ''}{debtsSnapshot.otherSecured ? 'secured' : ''}{!debtsSnapshot.priority && !debtsSnapshot.otherSecured ? 'Unsecured' : ''} {debtsSnapshot.cosigned ? '; co-signed' : ''}
              {debtsSnapshot.unsecuredText ? ` — ${debtsSnapshot.unsecuredText}` : ''}
            </span>
          </div>
          <div className="financial-snapshot-line">
            <span className="financial-snapshot-term">Income</span>
            <span className="financial-snapshot-desc">
              {incomeSnapshot.debtorEmployed ? 'Employed' : 'Not employed'}{isJointFiling(answers) ? `; spouse ${incomeSnapshot.spouseEmployed ? 'employed' : 'not employed'}` : ''}. Docs: {incomeSnapshot.incomeDocsUploaded ? 'received' : 'missing'}
            </span>
          </div>
          <div className="financial-snapshot-line">
            <span className="financial-snapshot-term">Co-signed</span>
            <span className="financial-snapshot-desc">{debtsSnapshot.cosigned ? 'Yes' : 'None'}</span>
          </div>
        </div>
      </div>

      <div id="documents" className="dashboard-section attorney-card documents-card">
        <h3 className="card-title">Document Sufficiency</h3>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Status</th>
                <th>Need</th>
                <th>Last detected</th>
              </tr>
            </thead>
            <tbody>
              {documentSufficiency.map((d) => (
                <tr key={d.type}>
                  <td>{d.type}</td>
                  <td><span className={`pill-badge pill-${d.status.toLowerCase()}`}>{d.status}</span></td>
                  <td>{d.coverageRule}</td>
                  <td>{d.lastDetected ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-section attorney-card creditor-reliability-row">
        <div className="attorney-card creditor-matrix-card">
          <h3 className="card-title">Creditor Matrix</h3>
          <p className="card-sub">Secured, priority, unsecured, co-signed</p>
          {creditorMatrix.length === 0 ? (
            <p className="matrix-empty">No creditors listed yet.</p>
          ) : (
            <>
              <ul className="creditor-matrix-list">
                {creditorMatrix.slice(0, 12).map((row, i) => (
                  <li key={i} className={`creditor-row type-${row.type.toLowerCase()}`}>
                    <span className="creditor-name">{row.name}</span>
                    <span className="creditor-type">{row.type}</span>
                  </li>
                ))}
              </ul>
              {creditorMatrix.length > 12 && <p className="matrix-more">+{creditorMatrix.length - 12} more</p>}
              <button
                type="button"
                className="btn-export-creditor"
                onClick={() => {
                  const text = exportCreditorWorksheet(answers);
                  navigator.clipboard.writeText(text).then(() => showToast('Copied')).catch(() => showToast('Copy failed'));
                }}
              >
                Copy creditor worksheet
              </button>
            </>
          )}
        </div>
        <div className="attorney-card client-reliability-card">
          <h3 className="card-title">Client Reliability</h3>
          <div className="reliability-score">{clientReliability.score}</div>
          <div className="reliability-label">{clientReliability.label}</div>
          <dl className="reliability-breakdown">
            <dt>Missing required fields</dt><dd>{clientReliability.breakdown.missingRequired}</dd>
            <dt>Docs missing</dt><dd>{clientReliability.breakdown.docsMissing}</dd>
            <dt>Flagged answers</dt><dd>{clientReliability.breakdown.flaggedAnswers}</dd>
          </dl>
        </div>
      </div>

      <div className="dashboard-section attorney-card timeline-filing-row">
        <div className="attorney-card timeline-card">
          <h3 className="card-title">Earliest Filing Readiness</h3>
          <div className="timeline-days">~{timelineReadiness.days}</div>
          <div className="timeline-note">{timelineReadiness.note}</div>
        </div>
        <div className="attorney-card filing-checklist-card">
          <h3 className="card-title">Filing Checklist</h3>
          {!filingChecklistOpen ? (
            <button type="button" className="btn-generate-checklist" onClick={() => setFilingChecklistOpen(true)}>
              Generate filing checklist
            </button>
          ) : (
            <div className="filing-checklist-output">
              <div className="filing-checklist-section">
                <div className="filing-checklist-heading">Client must provide</div>
                <ul>
                  {filingChecklist.clientMustProvide.length === 0 ? <li>None listed</li> : filingChecklist.clientMustProvide.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="filing-checklist-section">
                <div className="filing-checklist-heading">Attorney must confirm</div>
                <ul>
                  {filingChecklist.attorneyMustConfirm.length === 0 ? <li>None listed</li> : filingChecklist.attorneyMustConfirm.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <button type="button" className="btn-regenerate-checklist" onClick={() => setFilingChecklistOpen(false)}>Hide</button>
            </div>
          )}
        </div>
      </div>

      <div className="attorney-card raw-section">
        <button
          type="button"
          className="raw-toggle"
          onClick={() => setRawOpen(!rawOpen)}
          aria-expanded={rawOpen}
        >
          Developer / Debug Data
        </button>
        {rawOpen && (
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
