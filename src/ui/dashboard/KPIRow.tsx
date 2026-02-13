/**
 * Health metrics row: completion %, required missing, docs, flags, reliability.
 */
export interface KPIRowProps {
  completionPct: number;
  missingCount: number;
  docTotal: number;
  docReceived: number;
  flagsAndUrgencyCount: number;
  reliabilityScore: number;
}

export function KPIRow({
  completionPct,
  missingCount,
  docTotal,
  docReceived,
  flagsAndUrgencyCount,
  reliabilityScore,
}: KPIRowProps) {
  return (
    <div className="dashboard-health-row">
      <span className="health-tile">
        <strong>Completion</strong> {completionPct}%
      </span>
      <span className="health-tile">
        <strong>Required missing</strong> {missingCount}
      </span>
      <span className="health-tile">
        <strong>Docs missing</strong> {docTotal - docReceived}
      </span>
      <span className="health-tile">
        <strong>Flags</strong> {flagsAndUrgencyCount}
      </span>
      <span className="health-tile">
        <strong>Reliability</strong> {reliabilityScore}
      </span>
    </div>
  );
}
