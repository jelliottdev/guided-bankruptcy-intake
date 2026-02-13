/**
 * Client reliability score and recommended next step.
 */
export interface ClientReliabilityCardProps {
  score: number;
  breakdown: { missingRequired: number; docsMissing: number; flaggedAnswers: number };
  recommendedNextStep: string;
}

export function ClientReliabilityCard({
  score,
  breakdown,
  recommendedNextStep,
}: ClientReliabilityCardProps) {
  const tooltip =
    'Based on: required answers filled, document uploads, and client flags. Higher = less follow-up likely.';
  return (
    <div className="dashboard-card reliability-inline reliability-metric-card">
      <div className="dashboard-card-title">Client reliability</div>
      <div
        className="reliability-inline-score"
        title={tooltip}
        aria-label="Score formula: required answers, document uploads, flags"
      >
        {score}
        <span className="reliability-tooltip" title={tooltip} aria-hidden>
          ⓘ
        </span>
      </div>
      <div className="reliability-inline-detail">
        {breakdown.missingRequired} missing, {breakdown.docsMissing} docs,{' '}
        {breakdown.flaggedAnswers} flagged
      </div>
      <div className="reliability-formula-hint">Based on: required answers, document uploads, flags</div>
      <div className="reliability-next-step">{recommendedNextStep}</div>
    </div>
  );
}
