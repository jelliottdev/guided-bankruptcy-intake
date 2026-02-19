import { useState } from 'react';
import type { Issue } from '../../issues/types';
import { IssueInbox } from './IssueInbox';
import { MessagesPanel } from './MessagesPanel';
import { SchedulePanel } from './SchedulePanel';

type RailTab = 'issues' | 'messages' | 'schedule';

interface RightRailHubProps {
  issues: Issue[];
  onOpenIssue?: (issue: Issue) => void;
  onCreateGeneralIssue: (title: string, text: string) => void;
  onAddComment: (issueId: string, text: string) => void;
  onMarkNeedsReview: (issueId: string) => void;
  onAppointmentCreated?: (payload: { appointmentId: string; when: string }) => void;
}

export function RightRailHub(props: RightRailHubProps) {
  const [tab, setTab] = useState<RailTab>('issues');
  const issueCount = props.issues.length;
  const messageCount = props.issues.filter(
    (issue) => issue.comments.length > 0 || ['assigned', 'in_progress', 'needs_review'].includes(issue.status)
  ).length;

  return (
    <div className="right-rail-hub">
      <div className="right-rail-tabs" role="tablist" aria-label="Right rail tabs">
        <button type="button" className={tab === 'issues' ? 'active' : ''} onClick={() => setTab('issues')}>
          <span>Issues</span>
          <span className="tab-pill">{issueCount}</span>
        </button>
        <button type="button" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>
          <span>Messages</span>
          <span className="tab-pill">{messageCount}</span>
        </button>
        <button type="button" className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
          <span>Schedule</span>
        </button>
      </div>

      {tab === 'issues' && <IssueInbox issues={props.issues} onOpenIssue={props.onOpenIssue} />}
      {tab === 'messages' && (
        <MessagesPanel
          issues={props.issues}
          onCreateGeneralIssue={props.onCreateGeneralIssue}
          onAddComment={props.onAddComment}
          onMarkNeedsReview={props.onMarkNeedsReview}
        />
      )}
      {tab === 'schedule' && <SchedulePanel onAppointmentCreated={props.onAppointmentCreated} />}
    </div>
  );
}
