import { useMemo, useState } from 'react';
import type { Issue } from '../../issues/types';

type InboxFilter = 'all' | 'needs_attention' | 'attorney_requested' | 'awaiting_review' | 'done';

interface IssueInboxProps {
  issues: Issue[];
  onOpenIssue?: (issue: Issue) => void;
}

function filterIssues(issues: Issue[], filter: InboxFilter): Issue[] {
  if (filter === 'all') return issues;
  if (filter === 'needs_attention') {
    return issues.filter((i) => ['assigned', 'in_progress', 'needs_review'].includes(i.status));
  }
  if (filter === 'attorney_requested') {
    return issues.filter((i) => i.owner === 'client' && ['assigned', 'in_progress', 'needs_review'].includes(i.status));
  }
  if (filter === 'awaiting_review') {
    return issues.filter((i) => i.status === 'needs_review');
  }
  return issues.filter((i) => ['approved', 'resolved', 'closed_with_exception'].includes(i.status));
}

function statusLabel(status: Issue['status']): string {
  return status.replace(/_/g, ' ');
}

export function IssueInbox({ issues, onOpenIssue }: IssueInboxProps) {
  const [filter, setFilter] = useState<InboxFilter>('needs_attention');
  const filtered = useMemo(() => filterIssues(issues, filter), [issues, filter]);

  return (
    <div className="issue-inbox">
      <div className="issue-inbox-head">
        <h3>Issue Inbox</h3>
        <span className="issue-inbox-count">{filtered.length}</span>
      </div>
      <div className="issue-inbox-filters" role="tablist" aria-label="Issue filters">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'needs_attention' ? 'active' : ''} onClick={() => setFilter('needs_attention')}>Needs attention</button>
        <button type="button" className={filter === 'attorney_requested' ? 'active' : ''} onClick={() => setFilter('attorney_requested')}>Attorney requested</button>
        <button type="button" className={filter === 'awaiting_review' ? 'active' : ''} onClick={() => setFilter('awaiting_review')}>Awaiting review</button>
        <button type="button" className={filter === 'done' ? 'active' : ''} onClick={() => setFilter('done')}>Done</button>
      </div>

      {filtered.length === 0 ? (
        <div className="issue-inbox-empty">No issues in this view.</div>
      ) : (
        <ul className="issue-inbox-list">
          {filtered.map((issue) => (
            <li key={issue.id} className="issue-inbox-row">
              <button type="button" onClick={() => onOpenIssue?.(issue)}>
                <span className="issue-row-title">{issue.title}</span>
                <span className="issue-row-meta">
                  {issue.owner} · {statusLabel(issue.status)}
                  {issue.dueAt ? ` · due ${new Date(issue.dueAt).toLocaleDateString()}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
