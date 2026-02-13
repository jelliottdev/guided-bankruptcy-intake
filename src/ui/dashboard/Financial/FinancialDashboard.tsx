/**
 * Financial signals card: assets/debts/income snapshot, attorney overlay form, income vs expenses bar.
 */
import { useState, useCallback } from 'react';
import type { AttorneyFinancialEntry } from '../dashboardShared';
import {
  formatCurrency,
  parseCurrencyInput,
  loadAttorneyFinancial,
  saveAttorneyFinancial,
} from '../dashboardShared';

export interface FinancialDashboardProps {
  assetsSnapshot: { vehicles: number; properties: number; bankAccounts: number };
  debtsSnapshot: {
    priority: boolean;
    otherSecured: boolean;
    cosigned: boolean;
    unsecuredText: string | null;
  };
  incomeSnapshot: {
    debtorEmployed: boolean;
    spouseEmployed: boolean;
    otherList: string[];
    incomeDocsUploaded: boolean;
  };
  attorneyFinancial: AttorneyFinancialEntry;
  onAttorneyFinancialChange: (entry: AttorneyFinancialEntry) => void;
}

export function FinancialDashboard({
  assetsSnapshot,
  debtsSnapshot,
  incomeSnapshot,
  attorneyFinancial,
  onAttorneyFinancialChange,
}: FinancialDashboardProps) {
  const [financialEntryOpen, setFinancialEntryOpen] = useState(false);
  const [financialEntryDraft, setFinancialEntryDraft] = useState<AttorneyFinancialEntry>(() =>
    loadAttorneyFinancial()
  );

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

  const saveFinancialEntry = useCallback(() => {
    onAttorneyFinancialChange(financialEntryDraft);
    saveAttorneyFinancial(financialEntryDraft);
    setFinancialEntryOpen(false);
  }, [financialEntryDraft, onAttorneyFinancialChange]);

  const openForm = useCallback(() => {
    setFinancialEntryDraft({ ...attorneyFinancial });
    setFinancialEntryOpen((o) => !o);
  }, [attorneyFinancial]);

  const debtsDesc = [
    debtsSnapshot.priority && 'Priority',
    debtsSnapshot.otherSecured && 'Secured',
    !debtsSnapshot.priority && !debtsSnapshot.otherSecured && 'Unsecured',
  ]
    .filter(Boolean)
    .join(', ');
  const incomeDesc = incomeSnapshot.debtorEmployed
    ? 'Employed'
    : 'Not employed';
  const incomeDocs = incomeSnapshot.incomeDocsUploaded ? 'received' : 'missing';

  return (
    <div className="dashboard-card financial-signals-card">
      <div className="financial-signals-header">
        <div className="dashboard-card-title">Financial signals</div>
        <button type="button" className="btn-financial-edit" onClick={openForm}>
          {hasAnyFinancialEntry ? 'Edit numbers' : 'Add numbers'}
        </button>
      </div>
      <div className="financial-signals-grid">
        <div className="financial-signals-line">
          <span className="financial-signals-term">Assets</span>
          <span className="financial-signals-desc">
            {assetsSnapshot.vehicles} vehicles,{' '}
            {assetsSnapshot.properties > 0
              ? `${assetsSnapshot.properties} real estate`
              : 'no real estate'}
            , {assetsSnapshot.bankAccounts} bank accounts
          </span>
        </div>
        <div className="financial-signals-line">
          <span className="financial-signals-term">Debts</span>
          <span className="financial-signals-desc">
            {debtsDesc}
            {debtsSnapshot.cosigned ? '; co-signed' : ''}
          </span>
        </div>
        <div className="financial-signals-line">
          <span className="financial-signals-term">Income</span>
          <span className="financial-signals-desc">
            {incomeDesc}; docs {incomeDocs}
          </span>
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
              value={
                financialEntryDraft.monthlyIncome != null
                  ? String(financialEntryDraft.monthlyIncome)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  monthlyIncome: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-row">
            <label>Monthly expenses</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 3800"
              value={
                financialEntryDraft.monthlyExpenses != null
                  ? String(financialEntryDraft.monthlyExpenses)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  monthlyExpenses: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-row">
            <label>Unsecured debt</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 25000"
              value={
                financialEntryDraft.unsecuredDebt != null
                  ? String(financialEntryDraft.unsecuredDebt)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  unsecuredDebt: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-row">
            <label>Secured debt</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 150000"
              value={
                financialEntryDraft.securedDebt != null
                  ? String(financialEntryDraft.securedDebt)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  securedDebt: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-row">
            <label>Priority debt</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 5000"
              value={
                financialEntryDraft.priorityDebt != null
                  ? String(financialEntryDraft.priorityDebt)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  priorityDebt: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-row">
            <label>Total assets</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 12000"
              value={
                financialEntryDraft.assetTotal != null
                  ? String(financialEntryDraft.assetTotal)
                  : ''
              }
              onChange={(e) =>
                setFinancialEntryDraft((d) => ({
                  ...d,
                  assetTotal: parseCurrencyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="financial-entry-actions">
            <button type="button" className="btn-financial-save" onClick={saveFinancialEntry}>
              Save
            </button>
            <button
              type="button"
              className="btn-financial-cancel"
              onClick={() => setFinancialEntryOpen(false)}
            >
              Cancel
            </button>
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
            <div
              className={`financial-tile financial-tile-surplus ${surplus >= 0 ? 'positive' : 'negative'}`}
            >
              <span className="financial-tile-label">{surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
              <span className="financial-tile-value">{formatCurrency(Math.abs(surplus))}</span>
            </div>
            <div className="financial-tile">
              <span className="financial-tile-label">Total debt</span>
              <span className="financial-tile-value">{formatCurrency(totalDebt)}</span>
            </div>
            <div className="financial-tile">
              <span className="financial-tile-label">Assets</span>
              <span className="financial-tile-value">
                {formatCurrency(attorneyFinancial.assetTotal ?? 0)}
              </span>
            </div>
          </div>
          {(monthlyIncome > 0 || monthlyExpenses > 0) && (
            <div className="financial-bar-chart">
              <div className="financial-bar-row">
                <span className="financial-bar-label">Income</span>
                <div className="financial-bar-track">
                  <div
                    className="financial-bar-fill financial-bar-income"
                    style={{ width: `${(monthlyIncome / maxBar) * 100}%` }}
                  />
                </div>
                <span className="financial-bar-value">{formatCurrency(monthlyIncome)}</span>
              </div>
              <div className="financial-bar-row">
                <span className="financial-bar-label">Expenses</span>
                <div className="financial-bar-track">
                  <div
                    className="financial-bar-fill financial-bar-expenses"
                    style={{ width: `${(monthlyExpenses / maxBar) * 100}%` }}
                  />
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
                  color:
                    expenseRatio / 100 > 0.9
                      ? 'var(--danger)'
                      : expenseRatio / 100 > 0.75
                        ? 'var(--warn)'
                        : 'var(--success)',
                }}
              >
                {expenseRatio.toFixed(1)}% of income
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
