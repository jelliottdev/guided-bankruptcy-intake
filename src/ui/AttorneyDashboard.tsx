import { useMemo, useState, useCallback } from 'react';
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

export interface AttorneyDashboardProps {
  email?: string | null;
  phone?: string | null;
  onGoToWizard: (stepIndex: number, fieldId?: string) => void;
  onReset: () => void;
}

export function AttorneyDashboard({ email, phone, onGoToWizard, onReset }: AttorneyDashboardProps) {
  const { state, setViewMode } = useIntake();
  const { answers, uploads, lastSavedAt } = state;
  const [rawOpen, setRawOpen] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const identityLine =
    email != null && phone != null
      ? `${maskEmail(email)} | ${maskPhone(phone)}`
      : 'Demo Case';

  const steps = useMemo(() => getVisibleSteps(answers), [answers]);
  const errors = useMemo(() => validateAll(answers).filter((e) => e.severity !== 'warning'), [answers]);

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
    const urgencyList = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
    const urgencyCount = urgencyList.filter((v) => v && !v.includes('None of')).length;
    const docTotal = DOCUMENT_IDS.length;
    const docReceived = DOCUMENT_IDS.filter((d) => (uploads[d.id]?.length ?? 0) > 0).length;
    const docPct = docTotal > 0 ? Math.round((docReceived / docTotal) * 100) : 0;
    return {
      completionPct,
      completionText: `${filledRequired} / ${totalRequired}`,
      missingCount,
      urgencyCount,
      urgencyList,
      docReceived,
      docTotal,
      docPct,
    };
  }, [answers, errors.length, steps, uploads]);

  const actionItems = useMemo(() => {
    const items: { label: string; stepIndex: number; fieldId?: string }[] = [];
    errors.forEach((e) => {
      items.push({ label: `Missing: ${e.message}`, stepIndex: e.stepIndex, fieldId: e.fieldId });
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
      const empty = isEmpty(v);
      const notSure = typeof v === 'string' && v.trim().toLowerCase().includes('not sure');
      if (empty || notSure) {
        items.push({ label: `Needs estimate: ${label}`, stepIndex: stepIdx, fieldId: id });
      }
    });
    return items;
  }, [answers, errors, steps]);

  const urgencyWithDates = useMemo(() => {
    const list = Array.isArray(answers['urgency_flags']) ? (answers['urgency_flags'] as string[]) : [];
    const result: { label: string; date?: string }[] = [];
    list.forEach((val) => {
      if (!val || val.includes('None of')) return;
      const label = URGENCY_LABELS[val] ?? val;
      if (val.includes('Foreclosure')) result.push({ label, date: answers['foreclosure_date'] as string });
      else if (val.includes('vehicle repossession')) result.push({ label, date: answers['repossession_date'] as string });
      else if (val.includes('Utility')) result.push({ label, date: answers['shutoff_date'] as string });
      else result.push({ label });
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

  const copyJson = useCallback(() => {
    const payload = { answers, uploads, exportedAt: new Date().toISOString() };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  }, [answers, uploads]);

  return (
    <div className="attorney-dashboard">
      <header className="attorney-header">
        <div className="attorney-header-top">
          <div>
            <h1 className="attorney-title">Attorney View</h1>
            <p className="attorney-subline">Case Intake Snapshot</p>
          </div>
          <div className="attorney-header-actions">
            <span className="attorney-last-saved">Last saved: {lastSavedText(lastSavedAt)}</span>
            <button type="button" className="btn btn-secondary" onClick={copyJson}>
              Copy JSON
            </button>
            <button type="button" className="btn btn-secondary" onClick={onReset}>
              Reset Demo
            </button>
            <button
              type="button"
              className={`modeToggle ${true ? 'on' : 'off'}`}
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
      </header>

      <div className="attorney-kpi-row">
        <div className={`kpi-card kpi-completion ${kpis.completionPct >= 80 ? 'green' : kpis.completionPct >= 50 ? 'amber' : 'red'}`}>
          <div className="kpi-title">Completion</div>
          <div className="kpi-value">{kpis.completionPct}%</div>
          <div className="kpi-sub">{kpis.completionText} required completed</div>
        </div>
        <div className={`kpi-card kpi-missing ${kpis.missingCount > 0 ? 'red' : ''}`}>
          <div className="kpi-title">Missing Required</div>
          <div className="kpi-value">{kpis.missingCount}</div>
          <div className="kpi-sub">Click to review</div>
        </div>
        <div className={`kpi-card kpi-urgency ${kpis.urgencyCount > 0 ? 'red' : ''}`}>
          <div className="kpi-title">Urgency Flags</div>
          <div className="kpi-value">{kpis.urgencyCount}</div>
          <div className="kpi-sub">
            {kpis.urgencyList.length > 0 && !kpis.urgencyList[0].includes('None of')
              ? kpis.urgencyList.map((v) => URGENCY_LABELS[v] ?? v).slice(0, 2).join(', ')
              : 'None'}
          </div>
        </div>
        <div className="kpi-card kpi-docs">
          <div className="kpi-title">Documents</div>
          <div className="kpi-value">{kpis.docReceived} / {kpis.docTotal}</div>
          <div className="kpi-sub">Required uploads received</div>
        </div>
      </div>

      <div className="attorney-row-2">
        <div className="attorney-card attorney-action-items">
          <h3>Action Items</h3>
          {actionItems.length === 0 ? (
            <p className="muted">No missing required or estimate items.</p>
          ) : (
            <ul className="action-list">
              {actionItems.map((item, i) => (
                <li key={i}>
                  {item.label}
                  {' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => onGoToWizard(item.stepIndex, item.fieldId)}
                  >
                    Go to field
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="attorney-card attorney-urgency-card">
          <h3>Urgent Risk Signals</h3>
          {urgencyWithDates.length === 0 ? (
            <p className="muted">No urgent issues reported.</p>
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

      <div className="attorney-card documents-section">
        <h3>Documents</h3>
        <div className="doc-table">
          {DOCUMENT_IDS.map((d) => {
            const files = uploads[d.id] ?? [];
            const status = files.length > 0 ? 'Received' : 'Missing';
            const isExpanded = expandedDoc === d.id;
            return (
              <div key={d.id} className="doc-row">
                <div
                  className="doc-row-head"
                  onClick={() => setExpandedDoc(isExpanded ? null : d.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedDoc(isExpanded ? null : d.id)}
                >
                  <span className="doc-category">{d.label}</span>
                  <span className={`doc-status ${status === 'Missing' ? 'missing' : ''}`}>{status}</span>
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
            <button type="button" className="btn btn-secondary btn-copy-raw" onClick={copyJson}>
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
