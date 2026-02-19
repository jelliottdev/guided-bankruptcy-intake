import type {
  Issue,
  IssueAttachment,
  IssueAuditEvent,
  IssueComment,
  IssueFilters,
  IssueOwner,
  IssueStatus,
} from './types';
import { trackUXEvent } from '../telemetry/localTelemetry';
import { scopedStorageKey } from '../state/clientScope';

const ISSUE_STORE_KEY = 'gbi:issues:v1';
const ISSUE_SCHEMA_VERSION = 1;

type LegacyActionStatus = Record<string, 'open' | 'reviewed' | 'followup'>;

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toIssueStatus(value: LegacyActionStatus[string]): IssueStatus {
  if (value === 'reviewed') return 'resolved';
  if (value === 'followup') return 'in_progress';
  return 'assigned';
}

function statusLabel(status: IssueStatus): string {
  return status.replace(/_/g, ' ');
}

function appendAudit(issue: Issue, actor: IssueOwner, type: IssueAuditEvent['type'], detail: string): Issue {
  const event: IssueAuditEvent = {
    id: randomId('audit'),
    actor,
    type,
    detail,
    createdAt: nowIso(),
  };
  return {
    ...issue,
    updatedAt: nowIso(),
    audit: [...issue.audit, event],
  };
}

function isIssue(obj: unknown): obj is Issue {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.title === 'string' && typeof o.status === 'string';
}

function migrateLegacyActionStatus(existing: Issue[], legacyStatus: LegacyActionStatus): Issue[] {
  const byId = new Map(existing.map((i) => [i.id, i]));
  let changed = false;

  for (const [actionId, statusValue] of Object.entries(legacyStatus)) {
    const issueId = `action:${actionId}`;
    const targetStatus = toIssueStatus(statusValue);
    const existingIssue = byId.get(issueId);
    if (existingIssue) {
      if (existingIssue.status !== targetStatus) {
        const updated = appendAudit(
          { ...existingIssue, status: targetStatus },
          'attorney',
          'status_changed',
          `Migrated legacy action status (${statusValue}).`
        );
        byId.set(issueId, updated);
        changed = true;
      }
      continue;
    }

    const createdAt = nowIso();
    const issue: Issue = {
      id: issueId,
      type: 'task',
      title: `Action item ${actionId}`,
      description: 'Migrated from legacy action status map.',
      owner: 'attorney',
      priority: 'important',
      status: targetStatus,
      attachments: [],
      comments: [],
      audit: [
        {
          id: randomId('audit'),
          actor: 'attorney',
          type: 'created',
          detail: `Created from legacy action status (${statusValue}).`,
          createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    };
    byId.set(issueId, issue);
    changed = true;
  }

  if (changed) trackUXEvent('issue_created', { source: 'legacy_action_status_migration' });
  return Array.from(byId.values());
}

export function loadIssues(): Issue[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(ISSUE_STORE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { schemaVersion?: number; issues?: unknown[] };
    if (!Array.isArray(parsed?.issues)) return [];
    return parsed.issues.filter(isIssue);
  } catch {
    return [];
  }
}

export function saveIssues(issues: Issue[]): void {
  try {
    localStorage.setItem(scopedStorageKey(ISSUE_STORE_KEY), JSON.stringify({ schemaVersion: ISSUE_SCHEMA_VERSION, issues }));
  } catch {
    // non-fatal in demo
  }
}

export function loadIssuesWithMigration(): Issue[] {
  const issues = loadIssues();
  let migrated = issues;
  try {
    const rawLegacy = localStorage.getItem('gbi:action-status');
    if (rawLegacy) {
      const legacy = JSON.parse(rawLegacy) as LegacyActionStatus;
      migrated = migrateLegacyActionStatus(issues, legacy);
      if (migrated !== issues) saveIssues(migrated);
    }
  } catch {
    // ignore migration errors
  }
  return migrated;
}

export function createIssue(partial: Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'audit' | 'attachments' | 'comments'>): Issue {
  const ts = nowIso();
  const issue: Issue = {
    ...partial,
    id: randomId('issue'),
    attachments: [],
    comments: [],
    audit: [
      {
        id: randomId('audit'),
        type: 'created',
        actor: partial.owner,
        detail: `Issue created (${statusLabel(partial.status)}).`,
        createdAt: ts,
      },
    ],
    createdAt: ts,
    updatedAt: ts,
  };
  trackUXEvent('issue_created', { type: partial.type, status: partial.status, owner: partial.owner });
  return issue;
}

export function updateIssueStatus(issue: Issue, status: IssueStatus, actor: IssueOwner): Issue {
  if (issue.status === status) return issue;
  trackUXEvent('issue_status_changed', { issueId: issue.id, from: issue.status, to: status });
  return appendAudit({ ...issue, status }, actor, 'status_changed', `Status changed to ${statusLabel(status)}.`);
}

export function addIssueComment(issue: Issue, author: IssueOwner, text: string): Issue {
  const comment: IssueComment = {
    id: randomId('comment'),
    author,
    text,
    createdAt: nowIso(),
  };
  return appendAudit(
    {
      ...issue,
      comments: [...issue.comments, comment],
    },
    author,
    'comment_added',
    'Added comment.'
  );
}

export function attachToIssue(issue: Issue, name: string, source: IssueAttachment['source'], actor: IssueOwner): Issue {
  const attachment: IssueAttachment = {
    id: randomId('attachment'),
    name,
    source,
    createdAt: nowIso(),
  };
  return appendAudit(
    {
      ...issue,
      attachments: [...issue.attachments, attachment],
    },
    actor,
    'attachment_added',
    `Attached: ${name}`
  );
}

export function resolveIssue(
  issue: Issue,
  input: { rationale: string; outcomeType: 'resolved' | 'approved' | 'closed_with_exception'; actor: IssueOwner }
): Issue {
  const resolved = {
    ...issue,
    status: input.outcomeType,
    resolution: {
      rationale: input.rationale,
      outcomeType: input.outcomeType,
      resolvedAt: nowIso(),
      resolvedBy: input.actor,
    },
  };
  const eventType: IssueAuditEvent['type'] =
    input.outcomeType === 'approved'
      ? 'approved'
      : input.outcomeType === 'closed_with_exception'
        ? 'closed_with_exception'
        : 'resolved';
  trackUXEvent('doc_resolution_closed', { issueId: issue.id, outcomeType: input.outcomeType });
  return appendAudit(resolved, input.actor, eventType, `Closed with outcome: ${input.outcomeType}. ${input.rationale}`);
}

export function listIssues(issues: Issue[], filters: IssueFilters = {}): Issue[] {
  return issues.filter((issue) => {
    if (filters.status && !filters.status.includes(issue.status)) return false;
    if (filters.owner && issue.owner !== filters.owner) return false;
    if (filters.type && issue.type !== filters.type) return false;
    if (filters.linkedFieldId && issue.linkedFieldId !== filters.linkedFieldId) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    return true;
  });
}
