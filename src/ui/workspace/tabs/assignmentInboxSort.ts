import type { GlobalStatus } from '../../shared/globalStatus';

export type InboxSortRow = {
  id: string;
  status: GlobalStatus;
  dueAt?: string;
  lastActivityAt: string; // ISO timestamp
};

const STATUS_RANK: Record<GlobalStatus, number> = {
  needs_review: 0,
  waiting_on_client: 1,
  needs_attorney: 2,
  resolved: 3,
};

export function dueAtEndOfDayMs(dueAt: string): number | null {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const end = new Date(parsed);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export type DueUrgency = 'overdue' | 'soon' | 'none';

export function getDueUrgency(dueAt?: string, now = new Date()): DueUrgency {
  if (!dueAt) return 'none';
  const dueMs = dueAtEndOfDayMs(dueAt);
  if (dueMs == null) return 'none';
  const diff = dueMs - now.getTime();
  if (diff < 0) return 'overdue';
  if (diff <= 48 * 60 * 60 * 1000) return 'soon';
  return 'none';
}

function dueSortValue(dueAt?: string): number {
  if (!dueAt) return Number.POSITIVE_INFINITY;
  const dueMs = dueAtEndOfDayMs(dueAt);
  if (dueMs == null) return Number.POSITIVE_INFINITY;
  return dueMs;
}

export function compareInboxRows(a: InboxSortRow, b: InboxSortRow): number {
  const statusRank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (statusRank !== 0) return statusRank;

  const aDue = dueSortValue(a.dueAt);
  const bDue = dueSortValue(b.dueAt);
  if (aDue !== bDue) return aDue - bDue;

  if (a.lastActivityAt !== b.lastActivityAt) {
    // Most recent activity first.
    return b.lastActivityAt.localeCompare(a.lastActivityAt);
  }

  return a.id.localeCompare(b.id);
}

export function formatShortDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString();
}

