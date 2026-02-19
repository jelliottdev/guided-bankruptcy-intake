import type { Issue } from '../../issues/types';
import type { QuestionnaireAssignment } from '../../questionnaires/types';

export type GlobalStatus = 'waiting_on_client' | 'needs_attorney' | 'needs_review' | 'resolved';

export type JoyTone = {
  color: 'neutral' | 'primary' | 'warning' | 'success' | 'danger';
  variant: 'soft' | 'solid';
};

export function labelForGlobalStatus(status: GlobalStatus): string {
  switch (status) {
    case 'waiting_on_client':
      return 'Waiting on client';
    case 'needs_attorney':
      return 'Needs attorney';
    case 'needs_review':
      return 'Needs review';
    case 'resolved':
      return 'Resolved';
    default:
      return (status as string).replace(/_/g, ' ');
  }
}

export function toneForGlobalStatus(status: GlobalStatus): JoyTone {
  switch (status) {
    case 'needs_review':
      return { color: 'danger', variant: 'solid' };
    case 'needs_attorney':
      return { color: 'warning', variant: 'soft' };
    case 'waiting_on_client':
      return { color: 'primary', variant: 'soft' };
    case 'resolved':
      return { color: 'success', variant: 'soft' };
    default:
      return { color: 'neutral', variant: 'soft' };
  }
}

export function statusFromIssue(issue: Issue): GlobalStatus {
  if (issue.status === 'needs_review') return 'needs_review';
  if (issue.status === 'resolved' || issue.status === 'approved' || issue.status === 'closed_with_exception') return 'resolved';
  return issue.owner === 'client' ? 'waiting_on_client' : 'needs_attorney';
}

export function statusFromAssignment(assignment: QuestionnaireAssignment): GlobalStatus {
  const stage = assignment.computedStage ?? 'assigned';
  if (stage === 'needs_review' || stage === 'submitted') return 'needs_review';
  if (stage === 'approved' || stage === 'closed') return 'resolved';
  if (stage === 'assigned' || stage === 'in_progress') return 'waiting_on_client';
  return 'needs_attorney';
}

