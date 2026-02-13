/**
 * Filing readiness: blockers, missing schedules, timeline, copy checklist.
 */
export interface FilingReadinessCardProps {
  primaryBlockers: string[];
  scheduleCoverage: { schedule: string; status: string }[];
  timelineReadiness: { days: string; note: string };
  filingChecklist: {
    clientMustProvide: string[];
    attorneyMustConfirm: string[];
  };
  onCopyChecklist: (text: string) => void;
}

export function FilingReadinessCard({
  primaryBlockers,
  scheduleCoverage,
  timelineReadiness,
  filingChecklist,
  onCopyChecklist,
}: FilingReadinessCardProps) {
  const missingSchedules = scheduleCoverage.filter((s) => s.status !== 'Ready');
  const checklistText = [
    primaryBlockers.length ? `Blockers: ${primaryBlockers.join('; ')}` : '',
    `Documents: ${filingChecklist.clientMustProvide.length ? filingChecklist.clientMustProvide.join('; ') : 'None listed'}`,
    `Schedules missing: ${missingSchedules.map((s) => s.schedule).join(', ') || 'None'}`,
    `Attorney confirm: ${filingChecklist.attorneyMustConfirm.join('; ') || 'None'}`,
    'Verify prior filings, pending lawsuits/garnishments, and recent transfers once docs arrive.',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="dashboard-card filing-readiness-card">
      <div className="dashboard-card-title">Filing readiness</div>
      {primaryBlockers.length > 0 && (
        <div className="filing-readiness-blockers">
          <strong>Blocks filing:</strong> {primaryBlockers.join(', ')}
        </div>
      )}
      <div className="filing-readiness-schedules">
        {missingSchedules.length > 0 && (
          <div className="filing-readiness-missing">
            Missing schedules: {missingSchedules.map((s) => s.schedule).join(', ')}
          </div>
        )}
      </div>
      <div className="filing-readiness-timeline">
        ~{timelineReadiness.days} — {timelineReadiness.note}
      </div>
      <button
        type="button"
        className="btn-generate-checklist"
        onClick={() => onCopyChecklist(checklistText)}
      >
        Copy filing checklist
      </button>
    </div>
  );
}
