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
import { maskEmail, maskPhone } from '../utils/mask';

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

export function AttorneyDashboard({ email, phone, onGoToWizard, onReset }: AttorneyDashboardProps) {
  const { state, setViewMode, setFlagResolved } = useIntake();
  const { answers, uploads, flags, lastSavedAt } = state;
  const [rawOpen, setRawOpen] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<'Copied' | 'Copy failed' | null>(null);
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const identityLine = useMemo(() => {
    const parts: string[] = [];
    if (email != null && String(email).trim()) parts.push(maskEmail(email));
    if (phone != null && String(phone).trim()) parts.push(maskPhone(phone));
    return parts.length > 0 ? parts.join(' | ') : 'Demo Case';
  }, [email, phone]);

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

  const caseSummary = useMemo(() => {
    const filing = answers['filing_setup'] === 'Filing with spouse' ? 'Joint filing' : 'Single filer';
    const props = hasRealEstate(answers) ? getRealEstateCount(answers) : 0;
    const vehicles = hasVehicles(answers) ? getVehicleCount(answers) : 0;
    const banks = hasBankAccounts(answers) ? getBankAccountCount(answers) : 0;
    const assets = props || vehicles || banks ? `${props} property, ${vehicles} vehicle, ${banks} bank` : 'No assets reported yet';
    const urgencyList = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]).filter((v) => v && !v.includes('None of')) : [];
    const urgency = urgencyList.length > 0 ? urgencyList.map((v) => URGENCY_LABELS[v] ?? v).join(', ') : 'No urgency flags';
    const docCount = DOCUMENT_IDS.filter((d) => (uploads[d.id]?.length ?? 0) > 0).length;
    const docs = docCount > 0 ? `${docCount} doc categories uploaded` : 'No documents uploaded';
    return `${filing} · ${assets} · ${urgency} · ${docs}`;
  }, [answers, uploads]);

  const nextActionsPreview = actionItems.slice(0, 3).map((a) => a.shortLabel).join(', ');
  const nextActionsEllipsis = actionItems.length > 3;
  const ACTION_VISIBLE = 8;
  const visibleActionItems = actionItemsExpanded ? actionItems : actionItems.slice(0, ACTION_VISIBLE);
  const hasMoreActions = actionItems.length > ACTION_VISIBLE;
  const visibleGrouped = useMemo(() => {
    const map = new Map<string, typeof visibleActionItems>();
    visibleActionItems.forEach((item) => {
      const list = map.get(item.stepTitle) ?? [];
      list.push(item);
      map.set(item.stepTitle, list);
    });
    return Array.from(map.entries());
  }, [visibleActionItems]);

  function itemKey(item: (typeof actionItems)[0]): string {
    return `${item.stepIndex}-${item.fieldId ?? 'unknown'}`;
  }

  return (
    <div className="attorney-dashboard">
      {urgencyWithDates.length > 0 && (
        <div className="attorney-urgency-banner" role="alert">
          Urgent: {urgencyWithDates[0].label}
          {urgencyWithDates[0].date && ` (${urgencyWithDates[0].date})`}
        </div>
      )}
      <header className="attorney-header">
        <div className="attorney-header-top">
          <div>
            <h1 className="attorney-title">Attorney View</h1>
            <p className="attorney-subline">Case Intake Snapshot</p>
          </div>
          <div className="attorney-header-actions">
            <span className="attorney-last-saved">Last saved: {lastSavedText(lastSavedAt)}</span>
            <button type="button" className="btn btn-secondary" onClick={copyExportBundle} title="Copy full export (answers + uploads + timestamp)">
              Copy JSON
            </button>
            {copyToast && <span className={`attorney-toast ${copyToast === 'Copy failed' ? 'attorney-toast-error' : ''}`}>{copyToast}</span>}
            <button type="button" className="btn btn-secondary" onClick={onReset}>
              Reset Demo
            </button>
            <button
              type="button"
              className="modeToggle on"
              onClick={() => setViewMode('client')}
              aria-pressed={true}
              aria-label="Switch to client view"
            >
              <span className="pill"><span className="knob" /></span>
              <span className="modeLabel">Client View</span>
            </button>
          </div>
        </div>
        <p className="attorney-identity">{identityLine}</p>
        {actionItems.length > 0 && (
          <p className="attorney-next-actions">
            Next: {nextActionsPreview}{nextActionsEllipsis ? '…' : ''}
          </p>
        )}
        <p className="attorney-case-summary">{caseSummary}</p>
      </header>

      <div className="attorney-kpi-row">
        <div className={`kpi-card kpi-completion ${kpis.completionPct >= 80 ? 'green' : kpis.completionPct >= 50 ? 'amber' : 'red'}`}>
          <div className="kpi-title">Completion</div>
          <div className="kpi-value">{kpis.completionPct}%</div>
          <div className="kpi-sub">{kpis.completionText} required completed</div>
          <div className="kpi-sub-note">visible required fields</div>
        </div>
        <div
          className={`kpi-card kpi-card-action kpi-missing kpi-clickable ${kpis.missingCount > 0 ? 'has-action' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => scrollToSection('action-items')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('action-items'); } }}
          aria-label="Jump to missing required items"
        >
          {kpis.missingCount > 0 && <span className="kpi-badge" aria-hidden>Action needed</span>}
          <div className="kpi-title">Missing Required</div>
          <div className="kpi-value">{kpis.missingCount}</div>
          <div className="kpi-sub">{kpis.missingCount > 0 ? 'Click to review' : 'None'}</div>
        </div>
        <div
          className={`kpi-card kpi-card-action kpi-flags kpi-clickable ${flaggedItems.length > 0 ? 'has-action' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => scrollToSection('client-flags')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('client-flags'); } }}
          aria-label="Jump to client flags and notes"
        >
          {flaggedItems.length > 0 && <span className="kpi-badge" aria-hidden>Action needed</span>}
          <div className="kpi-title">Client Flags</div>
          <div className="kpi-value">{flaggedItems.length}</div>
          <div className="kpi-sub">{flaggedItems.length > 0 ? 'Click to review' : 'None'}</div>
        </div>
        <div
          className={`kpi-card kpi-card-action kpi-urgency kpi-clickable ${kpis.urgencyCount > 0 ? 'has-action' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => scrollToSection('urgent-signals')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('urgent-signals'); } }}
          aria-label="Jump to urgent risk signals"
        >
          {kpis.urgencyCount > 0 && <span className="kpi-badge" aria-hidden>Action needed</span>}
          <div className="kpi-title">Urgency Flags</div>
          <div className="kpi-value">{kpis.urgencyCount}</div>
          <div className="kpi-sub">
            {kpis.displayUrgencyList.length > 0
              ? kpis.displayUrgencyList.map((v) => URGENCY_LABELS[v] ?? v).slice(0, 2).join(', ')
              : 'None'}
          </div>
        </div>
        <div
          className="kpi-card kpi-docs kpi-clickable"
          role="button"
          tabIndex={0}
          onClick={() => scrollToSection('documents')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('documents'); } }}
          aria-label="Jump to documents"
        >
          <div className="kpi-title">Documents</div>
          <div className="kpi-value">{kpis.docReceived} / {kpis.docTotal}</div>
          <div className="kpi-sub">Required uploads received</div>
        </div>
      </div>

      <div id="client-flags" className="attorney-card attorney-client-flags">
        <h3>Client Flags &amp; Notes</h3>
        {flaggedItems.length === 0 && resolvedFlagItems.length === 0 ? (
          <p className="muted">No client flags. Required fields that the client could not answer yet will appear here with their note.</p>
        ) : (
          <>
            {flaggedItems.length > 0 && (
              <ul className="client-flags-list">
                {flaggedItems.map((item) => (
                  <li key={item.fieldId} className="client-flag-item">
                    <div className="client-flag-label">{item.label} (Required)</div>
                    <div className="client-flag-note">Client note: &ldquo;{item.note}&rdquo;</div>
                    <div className="client-flag-actions">
                      <button type="button" className="btn-action-open" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>
                        Go to field
                      </button>
                      <button type="button" className="btn-action-state" onClick={() => setFlagResolved(item.fieldId, true)}>
                        Mark resolved
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {resolvedFlagItems.length > 0 && (
              <details className="client-flags-resolved">
                <summary>Resolved ({resolvedFlagItems.length})</summary>
                <ul className="client-flags-list">
                  {resolvedFlagItems.map((item) => (
                    <li key={item.fieldId} className="client-flag-item resolved">
                      <div className="client-flag-label">{item.label}</div>
                      <div className="client-flag-note">Client note: &ldquo;{item.note}&rdquo;</div>
                      <div className="client-flag-actions">
                        <button type="button" className="btn-action-open" onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}>
                          Go to field
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      <div className="attorney-row-2">
        <div id="action-items" className="attorney-card attorney-action-items">
          <h3>Action Items</h3>
          {actionItems.length === 0 ? (
            <p className="muted">No missing required or estimate items.</p>
          ) : (
            <>
              <div className="action-list-grouped">
                {visibleGrouped.map(([sectionTitle, items]) => (
                  <div key={sectionTitle} className="action-group">
                    <div className="action-group-title">{sectionTitle}</div>
                    <ul className="action-list">
                      {items.map((item) => {
                        const key = itemKey(item);
                        const review = actionReview[key];
                        return (
                          <li key={key}>
                            <span className="action-label">{item.shortLabel}</span>
                            <span className="action-actions">
                              <button
                                type="button"
                                className="btn-action-open"
                                onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}
                              >
                                Open
                              </button>
                              {review === 'reviewed' ? (
                                <button
                                  type="button"
                                  className="btn-action-state reviewed"
                                  onClick={() => setItemReview(key, null)}
                                  title="Clear reviewed"
                                >
                                  ✓ Reviewed
                                </button>
                              ) : review === 'follow-up' ? (
                                <button
                                  type="button"
                                  className="btn-action-state follow-up"
                                  onClick={() => setItemReview(key, null)}
                                  title="Clear follow-up"
                                >
                                  Needs follow-up
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn-action-state"
                                    onClick={() => setItemReview(key, 'reviewed')}
                                    title="Mark reviewed"
                                  >
                                    ✓ Reviewed
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action-state"
                                    onClick={() => setItemReview(key, 'follow-up')}
                                    title="Mark needs follow-up"
                                  >
                                    Needs follow-up
                                  </button>
                                </>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {hasMoreActions && !actionItemsExpanded && (
                <button type="button" className="link-button show-more" onClick={() => setActionItemsExpanded(true)}>
                  Show more ({actionItems.length - ACTION_VISIBLE} more)
                </button>
              )}
            </>
          )}
        </div>
        <div id="urgent-signals" className={`attorney-card attorney-urgency-card ${urgencyWithDates.length === 0 ? 'urgency-empty' : ''}`}>
          <h3>Urgent Risk Signals</h3>
          {urgencyWithDates.length === 0 ? (
            <p className="urgency-empty-badge">No urgent issues reported</p>
          ) : (
            <ul className="urgency-list">
              {urgencyWithDates.map((u, i) => (
                <li key={i}>
                  {u.label}
                  {u.date && <span className="urgency-date"> — {u.date}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="attorney-row-3">
        <div className="attorney-card snapshot-card">
          <h3>Assets Snapshot</h3>
          <ul className="snapshot-list">
            <li>Properties: {assetsSnapshot.properties}</li>
            <li>Vehicles: {assetsSnapshot.vehicles}</li>
            <li>Bank accounts: {assetsSnapshot.bankAccounts}</li>
            <li>Valuables: {assetsSnapshot.valuables ? 'Yes' : 'No'}</li>
          </ul>
        </div>
        <div className="attorney-card snapshot-card">
          <h3>Debts Snapshot</h3>
          <ul className="snapshot-list">
            <li>Priority debts: {debtsSnapshot.priority ? 'Yes' : 'No'}</li>
            <li>Other secured: {debtsSnapshot.otherSecured ? 'Yes' : 'No'}</li>
            <li>Co-signed debts: {debtsSnapshot.cosigned ? 'Yes' : 'No'}</li>
            {debtsSnapshot.unsecuredText && <li>Largest unsecured: {debtsSnapshot.unsecuredText}</li>}
          </ul>
        </div>
        <div className="attorney-card snapshot-card">
          <h3>Income Snapshot</h3>
          <ul className="snapshot-list">
            <li>Debtor employed: {incomeSnapshot.debtorEmployed ? 'Yes' : 'No'}</li>
            {isJointFiling(answers) && <li>Spouse employed: {incomeSnapshot.spouseEmployed ? 'Yes' : 'No'}</li>}
            {incomeSnapshot.otherList.length > 0 && (
              <li>Other income: {incomeSnapshot.otherList.join(', ')}</li>
            )}
            <li>Income docs uploaded: {incomeSnapshot.incomeDocsUploaded ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>

      <div id="documents" className="attorney-card documents-section">
        <h3>Documents</h3>
        <div className="doc-table">
          {DOCUMENT_IDS.map((d) => {
            const files = uploads[d.id] ?? [];
            const status =
              files.length > 0
                ? 'Received'
                : answers[`${d.id}_dont_have`] === 'Yes'
                  ? 'Pending (client marked)'
                  : 'Missing';
            const isExpanded = expandedDoc === d.id;
            return (
              <div key={d.id} className="doc-row">
                <div
                  className="doc-row-head"
                  onClick={() => setExpandedDoc(isExpanded ? null : d.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedDoc(isExpanded ? null : d.id);
                    }
                  }}
                >
                  <span className="doc-category">{d.label}</span>
                  <span className={`doc-status ${status === 'Missing' ? 'missing' : ''} ${status === 'Pending (client marked)' ? 'pending' : ''}`}>{status}</span>
                  <span className="doc-count">{files.length} file(s)</span>
                </div>
                {isExpanded && files.length > 0 && (
                  <ul className="doc-filenames">
                    {files.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
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
