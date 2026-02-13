/**
 * Means test calculator: state selector, median income vs CMI, pass/fail indicator.
 */
import { useState } from 'react';
import {
  getMedianIncomeStates,
  runMeansTest,
  type MeansTestResult,
} from '../../../attorney/meansTest';
import type { Answers } from '../../../form/types';
import { formatCurrency } from '../dashboardShared';

export interface MeansTestProps {
  answers: Answers;
  selectedState: string;
  onStateChange: (state: string) => void;
  onOpenIncome?: () => void;
}

export function MeansTest({ answers, selectedState, onStateChange, onOpenIncome }: MeansTestProps) {
  const result: MeansTestResult = runMeansTest(answers, selectedState || undefined);
  const states = getMedianIncomeStates();
  const [showDetails, setShowDetails] = useState(false);
  const deltaAnnual =
    result.medianAnnualIncome != null ? result.annualizedCMI - result.medianAnnualIncome : null;
  const deltaMonthly =
    result.medianMonthlyIncome != null ? result.currentMonthlyIncome - result.medianMonthlyIncome : null;

  return (
    <div className="dashboard-card means-test-card">
      <div className="dashboard-card-title">Means test</div>
      <div className="means-test-topline">
        <div className="means-test-topline-text">
          Compare current monthly income to the state median (cases filed on or after Nov 1, 2024).
        </div>
        {onOpenIncome && (
          <button type="button" className="btn btn-secondary means-test-open-income" onClick={onOpenIncome}>
            Open income
          </button>
        )}
      </div>
      <div className="means-test-state-row">
        <label htmlFor="means-test-state">State</label>
        <select
          id="means-test-state"
          className="means-test-state-select"
          value={selectedState || ''}
          onChange={(e) => onStateChange(e.target.value)}
          aria-label="State for median income"
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {!selectedState && (
        <div className="means-test-empty">
          Choose a state to run the means test. This uses household size and income already entered in intake.
        </div>
      )}
      {result.medianMonthlyIncome != null && (
        <div className="means-test-grid">
          {result.pass !== null && (
            <div
              className={`means-test-verdict means-test-verdict-${result.pass ? 'pass' : 'fail'}`}
              role="status"
            >
              <span className="means-test-verdict-label">{result.pass ? 'Below median' : 'Above median'}</span>
              {deltaAnnual != null && (
                <span className="means-test-verdict-delta">
                  {deltaAnnual >= 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(deltaAnnual))}/yr
                </span>
              )}
            </div>
          )}
          <div className="means-test-row">
            <span className="means-test-label">Median annual income ({result.state})</span>
            <span className="means-test-value">
              {result.medianAnnualIncome != null
                ? formatCurrency(result.medianAnnualIncome)
                : '—'}
            </span>
          </div>
          <div className="means-test-row">
            <span className="means-test-label">Your current monthly income (CMI)</span>
            <span className="means-test-value">{formatCurrency(result.currentMonthlyIncome)}</span>
          </div>
          <div className="means-test-row">
            <span className="means-test-label">Your annualized CMI</span>
            <span className="means-test-value">{formatCurrency(result.annualizedCMI)}</span>
          </div>
          {deltaMonthly != null && (
            <div className="means-test-row">
              <span className="means-test-label">Delta vs median (monthly)</span>
              <span className={`means-test-value ${deltaMonthly > 0 ? 'means-test-warn' : 'means-test-ok'}`}>
                {deltaMonthly >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(deltaMonthly))}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="means-test-note-row">
        <p className="means-test-note">{showDetails ? result.note : result.note.split(';')[0] + '.'}</p>
        <button type="button" className="btn btn-link means-test-note-toggle" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>
    </div>
  );
}
