export type IssueType = 'question' | 'document' | 'clarification' | 'task';

export type IssueStatus =
  | 'assigned'
  | 'in_progress'
  | 'needs_review'
  | 'resolved'
  | 'approved'
  | 'closed_with_exception';

export type IssuePriority = 'critical' | 'important' | 'normal';

export type IssueOwner = 'client' | 'attorney';

export interface IssueAttachment {
  id: string;
  name: string;
  source: 'upload' | 'note' | 'external';
  createdAt: string;
}

export interface IssueComment {
  id: string;
  author: IssueOwner;
  text: string;
  createdAt: string;
}

export interface IssueAuditEvent {
  id: string;
  type:
    | 'created'
    | 'status_changed'
    | 'comment_added'
    | 'attachment_added'
    | 'resolved'
    | 'approved'
    | 'closed_with_exception';
  actor: IssueOwner;
  detail: string;
  createdAt: string;
}

export interface IssueResolution {
  rationale: string;
  outcomeType: 'resolved' | 'approved' | 'closed_with_exception';
  resolvedAt: string;
  resolvedBy: IssueOwner;
}

export interface Issue {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  linkedFieldId?: string;
  linkedStepId?: string;
  dueAt?: string;
  owner: IssueOwner;
  priority: IssuePriority;
  status: IssueStatus;
  attachments: IssueAttachment[];
  comments: IssueComment[];
  audit: IssueAuditEvent[];
  resolution?: IssueResolution;
  createdAt: string;
  updatedAt: string;
}

export interface IssueFilters {
  status?: IssueStatus[];
  owner?: IssueOwner;
  type?: IssueType;
  linkedFieldId?: string;
  priority?: IssuePriority;
}
