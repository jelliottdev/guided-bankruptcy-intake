/**
 * Schedules coverage checklist: Ready/Missing per schedule.
 */
export type ScheduleRow = { schedule: string; status: 'Ready' | 'Missing'; detail: string };

export interface SchedulesChecklistProps {
  scheduleCoverage: ScheduleRow[];
}

export function SchedulesChecklist({ scheduleCoverage }: SchedulesChecklistProps) {
  return (
    <div className="dashboard-card schedules-checklist-card">
      <div className="dashboard-card-title">Schedules coverage</div>
      <ul className="schedules-checklist">
        {scheduleCoverage.map((row) => (
          <li
            key={row.schedule}
            className={`schedules-checklist-item schedule-${row.status.toLowerCase()}`}
          >
            <span className="schedules-checklist-mark">{row.status === 'Ready' ? '✓' : '✗'}</span>
            <span className="schedules-checklist-name">{row.schedule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
