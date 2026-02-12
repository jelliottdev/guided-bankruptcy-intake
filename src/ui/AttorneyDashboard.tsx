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

const ACTION_REVIEW_KEY = 'gbi:action-review';

function loadActionReview(): Record<string, 'reviewed' | 'follow-up'> {
  try {
    const raw = localStorage.getItem(ACTION_REVIEW_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, 'reviewed' | 'follow-up'> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'reviewed' || v === 'follow-up') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveActionReview(map: Record<string, 'reviewed' | 'follow-up'>) {
  try {
    localStorage.setItem(ACTION_REVIEW_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
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
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
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

  const resolvedFlagItems = useMemo(() => {
    const list: { fieldId: string; stepIndex: number; stepTitle: string; label: string; note: string }[] = [];
    Object.entries(flags).forEach(([fieldId, entry]) => {
      if (!entry.flagged || !entry.resolved) return;
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
    return list.sort((a, b) => a.stepTitle.localeCompare(b.stepTitle) || a.fieldId.localeCompare(b.fieldId));
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

  const [actionReview, setActionReview] = useState<Record<string, 'reviewed' | 'follow-up'>>(loadActionReview);
  const setItemReview = useCallback((key: string, value: 'reviewed' | 'follow-up' | null) => {
    setActionReview((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      saveActionReview(next);
      return next;
    });
  }, []);

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

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const urgencyStepIndex = useMemo(() => steps.findIndex((s) => s.id === 'urgency'), [steps]);
  type AttentionRow =
    | { type: 'FLAG'; id: string; label: string; stepIndex: number; fieldId: string; note: string }
    | { type: 'URGENT'; id: string; label: string; date?: string; stepIndex: number }
    | { type: 'MISSING'; id: string; label: string; stepIndex: number; fieldId: string };
  const attentionRows = useMemo((): AttentionRow[] => {
    const rows: AttentionRow[] = [];
    flaggedItems.forEach((item) => {
      rows.push({
        type: 'FLAG',
        id: `flag-${item.fieldId}`,
        label: shortActionLabel(item.label, false),
        stepIndex: item.stepIndex,
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
      });
    });
    errors.forEach((e) => {
      const step = steps[e.stepIndex];
      const field = step?.fields.find((f) => f.id === e.fieldId);
      const label = field?.label ?? e.message.replace(/\s+is required\.?$/i, '').trim();
      rows.push({
        type: 'MISSING',
        id: `missing-${e.fieldId}`,
        label: shortActionLabel(label, false),
        stepIndex: e.stepIndex,
        fieldId: e.fieldId,
      });
    });
    return rows;
  }, [flaggedItems, urgencyWithDates, errors, steps, urgencyStepIndex]);

  const ACTION_ITEMS_VISIBLE = 6;
  const visibleActionItems = actionItemsExpanded ? actionItems : actionItems.slice(0, ACTION_ITEMS_VISIBLE);
  const hasMoreActions = actionItems.length > ACTION_ITEMS_VISIBLE;

  function itemKey(item: (typeof actionItems)[0]): string {
    return `${item.stepIndex}-${item.fieldId ?? 'unknown'}`;
  }

  return (
    <div className="attorney-dashboard">
      <header className="attorney-header-bar">
        <div className="attorney-header-left">
          <h1 className="attorney-title">Attorney View</h1>
          <span className="attorney-subtitle">Case Intake Snapshot</span>
        </div>
        <div className="attorney-header-right">
          <span className="attorney-meta">{lastSavedText(lastSavedAt)}</span>
          <span className="attorney-meta-sep">•</span>
          <button type="button" className="btn-header" onClick={copyExportBundle} title="Copy full export">
            Copy JSON
          </button>
          <span className="attorney-meta-sep">•</span>
          <button type="button" className="btn-header" onClick={onReset}>Reset Demo</button>
          <span className="attorney-meta-sep">•</span>
          <button type="button" className="btn-header modeToggle on" onClick={() => setViewMode('client')} aria-label="Toggle Client View">
            <span className="pill"><span className="knob" /></span>
            Client View
          </button>
          {copyToast && <span className={`attorney-toast ${copyToast === 'Copy failed' ? 'attorney-toast-error' : ''}`}>{copyToast}</span>}
        </div>
      </header>

      <div className="attorney-kpi-strip">
        <div className={`kpi-card kpi-completion ${kpis.completionPct >= 80 ? 'green' : kpis.completionPct >= 50 ? 'amber' : 'red'}`}>
          <div className="kpi-value">{kpis.completionPct}%</div>
          <div className="kpi-label">Completion</div>
          <div className="kpi-sublabel">{kpis.completionText}</div>
        </div>
        <div className="kpi-card kpi-clickable" role="button" tabIndex={0} onClick={() => scrollToSection('attention-required')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('attention-required'); } }} aria-label="Jump to attention required">
          <div className="kpi-value">{kpis.missingCount}</div>
          <div className="kpi-label">Missing</div>
          <div className="kpi-sublabel">Click to review</div>
        </div>
        <div className="kpi-card kpi-clickable" role="button" tabIndex={0} onClick={() => scrollToSection('attention-required')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('attention-required'); } }} aria-label="Jump to client flags">
          <div className="kpi-value">{flaggedItems.length}</div>
          <div className="kpi-label">Client Flags</div>
          <div className="kpi-sublabel">{flaggedItems.length > 0 ? 'Click to review' : 'None'}</div>
        </div>
        <div className="kpi-card kpi-clickable" role="button" tabIndex={0} onClick={() => scrollToSection('attention-required')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('attention-required'); } }} aria-label="Jump to urgency">
          <div className="kpi-value">{kpis.urgencyCount}</div>
          <div className="kpi-label">Urgency</div>
          <div className="kpi-sublabel">{kpis.urgencyCount > 0 ? 'Click to review' : 'None'}</div>
        </div>
        <div className="kpi-card kpi-clickable" role="button" tabIndex={0} onClick={() => scrollToSection('documents')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('documents'); } }} aria-label="Jump to documents">
          <div className="kpi-value">{kpis.docReceived}/{kpis.docTotal}</div>
          <div className="kpi-label">Documents</div>
          <div className="kpi-sublabel">Received</div>
        </div>
      </div>

      <div id="attention-required" className="attorney-card attention-required-card">
        <h3 className="card-title">Attention Required</h3>
        {attentionRows.length === 0 ? (
          <div className="attention-empty">None</div>
        ) : (
          <ul className="attention-rows">
            {attentionRows.map((row) => (
              <li key={row.id} className="attention-row">
                <span className={`badge badge-${row.type.toLowerCase()}`}>{row.type}</span>
                <span className="attention-label">
                  {row.type === 'FLAG' && `${row.label} — client note provided`}
                  {row.type === 'URGENT' && (row.date ? `${row.label} — ${row.date}` : row.label)}
                  {row.type === 'MISSING' && `${row.label} — missing`}
                </span>
                <span className="attention-actions">
                  {row.type === 'FLAG' && (
                    <>
                      <button type="button" className="btn-open" onClick={() => onGoToWizard(row.stepIndex, row.fieldId)}>Open</button>
                      <button type="button" className="btn-state" onClick={() => setFlagResolved(row.fieldId, true)}>Mark resolved</button>
                    </>
                  )}
                  {row.type === 'URGENT' && (
                    <button type="button" className="btn-open" onClick={() => onGoToWizard(row.stepIndex)}>Open</button>
                  )}
                  {row.type === 'MISSING' && (
                    <button type="button" className="btn-open" onClick={() => onGoToWizard(row.stepIndex, row.fieldId)}>Open</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {resolvedFlagItems.length > 0 && (
          <details className="attention-resolved">
            <summary>Resolved ({resolvedFlagItems.length})</summary>
            <ul className="attention-rows">
              {resolvedFlagItems.map((item) => (
                <li key={item.fieldId} className="attention-row resolved">
                  <span className="badge badge-flag">FLAG</span>
                  <span className="attention-label">{item.label}</span>
                  <button type="button" className="btn-open" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Open</button>
                  <blockquote className="attention-note-block">&ldquo;{item.note}&rdquo;</blockquote>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="attorney-snapshot-grid">
        <div className="attorney-card snapshot-card">
          <h3 className="card-title">Assets Snapshot</h3>
          <dl className="snapshot-dl">
            <dt>Properties</dt><dd>{assetsSnapshot.properties}</dd>
            <dt>Vehicles</dt><dd>{assetsSnapshot.vehicles}</dd>
            <dt>Bank Accts</dt><dd>{assetsSnapshot.bankAccounts}</dd>
            <dt>Valuables</dt><dd>{assetsSnapshot.valuables ? 'Yes' : 'No'}</dd>
          </dl>
        </div>
        <div className="attorney-card snapshot-card">
          <h3 className="card-title">Debts Snapshot</h3>
          <dl className="snapshot-dl">
            <dt>Priority</dt><dd>{debtsSnapshot.priority ? 'Yes' : 'No'}</dd>
            <dt>Secured</dt><dd>{debtsSnapshot.otherSecured ? 'Yes' : 'No'}</dd>
            <dt>Co-signed</dt><dd>{debtsSnapshot.cosigned ? 'Yes' : 'No'}</dd>
            {debtsSnapshot.unsecuredText && <><dt>Largest unsecured</dt><dd>{debtsSnapshot.unsecuredText}</dd></>}
          </dl>
        </div>
        <div className="attorney-card snapshot-card">
          <h3 className="card-title">Income Snapshot</h3>
          <dl className="snapshot-dl">
            <dt>Employed</dt><dd>{incomeSnapshot.debtorEmployed ? 'Yes' : 'No'}</dd>
            {isJointFiling(answers) && <><dt>Spouse employed</dt><dd>{incomeSnapshot.spouseEmployed ? 'Yes' : 'No'}</dd></>}
            <dt>Other income</dt><dd>{incomeSnapshot.otherList.length > 0 ? 'Yes' : 'No'}</dd>
            <dt>Docs</dt><dd>{incomeSnapshot.incomeDocsUploaded ? 'Received' : 'Missing'}</dd>
          </dl>
        </div>
      </div>

      <div id="documents" className="attorney-card documents-card">
        <h3 className="card-title">Document Status</h3>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Status</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENT_IDS.map((d) => {
                const files = uploads[d.id] ?? [];
                const status = files.length > 0 ? 'Received' : answers[`${d.id}_dont_have`] === 'Yes' ? 'Pending' : 'Missing';
                return (
                  <tr key={d.id}>
                    <td>{d.label}</td>
                    <td><span className={`pill-badge pill-${status.toLowerCase()}`}>{status}</span></td>
                    <td>{files.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div id="action-items" className="attorney-card action-items-card">
        <h3 className="card-title">Action Items ({actionItems.length})</h3>
        {actionItems.length === 0 ? (
          <div className="action-items-empty">None</div>
        ) : (
          <>
            <ul className="action-rows">
              {visibleActionItems.map((item) => {
                const key = itemKey(item);
                const review = actionReview[key];
                return (
                  <li key={key} className="action-row">
                    <span className="action-label">{item.shortLabel}</span>
                    <span className="action-buttons">
                      <button type="button" className="btn-open" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>Open</button>
                      {review === 'reviewed' ? (
                        <button type="button" className="btn-state reviewed" onClick={() => setItemReview(key, null)}>✓ Reviewed</button>
                      ) : review === 'follow-up' ? (
                        <button type="button" className="btn-state follow-up" onClick={() => setItemReview(key, null)}>Follow-up</button>
                      ) : (
                        <>
                          <button type="button" className="btn-state" onClick={() => setItemReview(key, 'reviewed')}>✓ Reviewed</button>
                          <button type="button" className="btn-state" onClick={() => setItemReview(key, 'follow-up')}>Follow-up</button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {hasMoreActions && !actionItemsExpanded && (
              <button type="button" className="show-more-btn" onClick={() => setActionItemsExpanded(true)}>Show more ▼</button>
            )}
          </>
        )}
      </div>

      <div className="attorney-card raw-section">
        <button
          type="button"
          className="raw-toggle"
          onClick={() => setRawOpen(!rawOpen)}
          aria-expanded={rawOpen}
        >
          Raw Intake Data
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
