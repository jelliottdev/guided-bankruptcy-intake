/**
 * Single action item in the queue: label, reason, jump button, status select.
 */
import type { ActionStatusValue } from '../dashboardShared';
import type { Flags } from '../../../form/types';

export type ActionQueueItem = {
  issueId?: string;
  severity: 'critical' | 'important' | 'follow-up';
  label: string;
  reason: string;
  clientNote?: string;
  action: string;
  stepIndex: number;
  fieldId?: string;
};

export interface ActionCardProps {
  item: ActionQueueItem;
  itemId: string;
  status: ActionStatusValue | undefined;
  flags: Flags;
  source?: 'critical' | 'important';
  onJumpToField: (stepIndex: number, fieldId?: string) => void;
  onStatusChange: (itemId: string, value: string, fieldId?: string) => void;
  setFlagResolved?: (fieldId: string, resolved: boolean) => void;
}

export function ActionCard({
  item,
  itemId,
  status,
  flags,
  source: _source,
  onJumpToField,
  onStatusChange,
}: ActionCardProps) {
  const resolved = item.fieldId && flags[item.fieldId]?.resolved;
  const displayStatus = resolved ? 'resolved' : (status ?? 'open');

  return (
    <li className="action-row">
      <div className="action-row-main">
        <div className="action-row-title">{item.label}</div>
        {item.clientNote && <div className="action-row-sub">&ldquo;{item.clientNote}&rdquo;</div>}
        <div className="action-row-sub">
          {item.reason} · {item.action}
        </div>
      </div>
      <div className="action-row-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onJumpToField(item.stepIndex, item.fieldId)}
        >
          Jump to field
        </button>
        <select
          className="action-status-select"
          value={displayStatus}
          onChange={(e) => onStatusChange(itemId, e.target.value, item.fieldId)}
          aria-label="Status"
        >
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="followup">Follow-up</option>
          {item.fieldId && <option value="resolved">Resolved</option>}
        </select>
      </div>
    </li>
  );
}
