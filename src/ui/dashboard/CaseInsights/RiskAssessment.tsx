/**
 * Risk assessment: exception factors + recommended actions for attorney review.
 */
import type { RiskAssessmentResult } from '../../../attorney/riskAssessment';

export interface RiskAssessmentProps {
  result: RiskAssessmentResult;
  onOpenDocRequests?: () => void;
  onOpenMeansTest?: () => void;
  onOpenExemptions?: () => void;
  onOpenBlockers?: () => void;
  onOpenDetails?: () => void;
}

export function RiskAssessment({
  result,
  onOpenDocRequests,
  onOpenMeansTest,
  onOpenExemptions,
  onOpenBlockers,
  onOpenDetails,
}: RiskAssessmentProps) {
  const allFactors = [
    ...result.dismissalRiskFactors,
    ...result.fraudIndicators,
    ...result.timelineRisk,
  ];
  const sevRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const topFactors = [...allFactors]
    .sort((a, b) => (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0))
    .slice(0, 3);

  const primaryAction = (() => {
    if (topFactors.some((f) => f.id === 'docs-missing') && onOpenDocRequests) return { label: 'Open document requests', onClick: onOpenDocRequests };
    if (topFactors.some((f) => f.id === 'above-median') && onOpenMeansTest) return { label: 'Review means test', onClick: onOpenMeansTest };
    if (topFactors.some((f) => f.id === 'non-exempt-assets') && onOpenExemptions) return { label: 'Review exemptions', onClick: onOpenExemptions };
    if (topFactors.some((f) => f.id === 'urgency') && onOpenBlockers) return { label: 'Open urgency items', onClick: onOpenBlockers };
    if (topFactors.some((f) => f.id === 'missing-required') && onOpenDetails) return { label: 'Open filing details', onClick: onOpenDetails };
    return null;
  })();

  return (
    <div className="dashboard-card risk-assessment-card">
      <div className="dashboard-card-title">Risk assessment</div>
      <p className="risk-disclaimer">Heuristic-based for awareness; not legal advice.</p>
      <div className="risk-topline">
        <div className="risk-topline-left">
          <div className="risk-top-label">Top risk</div>
          <div className="risk-top-value">{topFactors[0]?.label ?? 'No major risks detected'}</div>
        </div>
        {primaryAction ? (
          <button type="button" className="btn btn-secondary risk-top-action" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
        ) : null}
      </div>
      <div className="risk-score-row">
        <span className="risk-score-label">Active risk factors</span>
        <span className="risk-score-value">{allFactors.length}</span>
      </div>
      {allFactors.length > 0 && (
        <ul className="risk-factors-list">
          {allFactors.map((f) => (
            <li key={f.id} className={`risk-factor severity-${f.severity}`}>
              <span className="risk-factor-label">{f.label}</span>
              <span className="risk-factor-sep" aria-hidden="true"> — </span>
              <span className="risk-factor-note">{f.note}</span>
            </li>
          ))}
        </ul>
      )}
      {result.recommendations.length > 0 && (
        <div className="risk-recommendations">
          <strong>Recommendations</strong>
          <ul>
            {result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
