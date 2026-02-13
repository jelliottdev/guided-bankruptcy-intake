/**
 * Exemption analysis: apply exemptions to assets, show non-exempt (at-risk) amounts.
 */
import {
  runExemptionAnalysis,
  getExemptionStateOptions,
} from '../../../attorney/exemptions';
import type { Answers } from '../../../form/types';
import { formatCurrency } from '../dashboardShared';

export interface ExemptionAnalysisProps {
  answers: Answers;
  selectedExemptionSet: string;
  onExemptionSetChange: (value: string) => void;
  onOpenAsset?: (fieldId: string) => void;
}

export function ExemptionAnalysis({
  answers,
  selectedExemptionSet,
  onExemptionSetChange,
  onOpenAsset,
}: ExemptionAnalysisProps) {
  const result = runExemptionAnalysis(answers, selectedExemptionSet || 'federal');
  const options = getExemptionStateOptions();
  const atRiskAssets = result.assets
    .filter((a) => a.atRisk && a.nonExemptAmount > 0)
    .sort((a, b) => b.nonExemptAmount - a.nonExemptAmount)
    .slice(0, 5);

  const assetFieldId = (category: string, description: string): string | null => {
    const m = description.match(/(\d+)/);
    const n = m ? Number(m[1]) : null;
    if (category === 'Real estate' && n) return `property_${n}_value`;
    if (category === 'Vehicle' && n) return `vehicle_${n}_value`;
    if (category === 'Bank accounts') return 'account_1_balance';
    if (category === 'Household property') return 'household_property';
    return null;
  };

  return (
    <div className="dashboard-card exemption-analysis-card">
      <div className="dashboard-card-title">Exemption analysis</div>
      <p className="exemption-disclaimer">
        Approximate. Apply {result.exemptionSet.name} exemptions to reported assets.
      </p>
      <div className="exemption-set-row">
        <label htmlFor="exemption-set">Exemption set</label>
        <select
          id="exemption-set"
          className="exemption-set-select"
          value={selectedExemptionSet || 'federal'}
          onChange={(e) => onExemptionSetChange(e.target.value)}
          aria-label="Exemption set"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'federal' ? 'Federal' : opt}
            </option>
          ))}
        </select>
      </div>
      {result.assets.length === 0 ? (
        <p className="exemption-empty">No asset values reported yet.</p>
      ) : (
        <>
          <div className="exemption-verdict">
            <div className="exemption-verdict-label">
              {result.totalNonExempt > 0 ? 'Non-exempt exposure' : 'No non-exempt exposure detected'}
            </div>
            <div className={`exemption-verdict-value ${result.totalNonExempt > 0 ? 'at-risk' : ''}`}>
              {formatCurrency(result.totalNonExempt)}
            </div>
          </div>
          <div className="exemption-summary">
            <div className="exemption-summary-row">
              <span>Total value</span>
              <span>{formatCurrency(result.totalValue)}</span>
            </div>
            <div className="exemption-summary-row">
              <span>Exempt</span>
              <span className="exemption-exempt">{formatCurrency(result.totalExempt)}</span>
            </div>
            <div className="exemption-summary-row">
              <span>Non-exempt</span>
              <span className={result.totalNonExempt > 0 ? 'exemption-at-risk' : ''}>
                {formatCurrency(result.totalNonExempt)}
              </span>
            </div>
          </div>
          {result.atRiskCategories.length > 0 && (
            <div className="exemption-at-risk-list">
              <strong>At-risk:</strong>{' '}
              {(() => {
                const counts = result.atRiskCategories.reduce<Record<string, number>>((acc, cat) => {
                  acc[cat] = (acc[cat] ?? 0) + 1;
                  return acc;
                }, {});
                return Object.entries(counts)
                  .map(([cat, n]) => (n > 1 ? `${cat} (${n})` : cat))
                  .join(', ');
              })()}
            </div>
          )}
          {atRiskAssets.length > 0 && (
            <div className="exemption-at-risk-table">
              <div className="exemption-at-risk-title">Top at-risk assets</div>
              <ul className="exemption-asset-list">
                {atRiskAssets.map((a, i) => {
                  const fieldId = assetFieldId(a.category, a.description);
                  return (
                    <li key={`${a.category}-${a.description}-${i}`} className="exemption-asset-row">
                      <div className="exemption-asset-main">
                        <div className="exemption-asset-name">{a.description}</div>
                        <div className="exemption-asset-meta">{a.category}</div>
                      </div>
                      <div className="exemption-asset-amount">{formatCurrency(a.nonExemptAmount)}</div>
                      {fieldId && onOpenAsset ? (
                        <button type="button" className="btn btn-secondary" onClick={() => onOpenAsset(fieldId)}>
                          Open
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
