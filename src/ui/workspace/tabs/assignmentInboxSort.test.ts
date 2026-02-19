import { describe, expect, it } from 'vitest';
import { compareInboxRows } from './assignmentInboxSort';

describe('assignmentInboxSort', () => {
  it('sorts by status rank: needs_review before waiting_on_client', () => {
    const a = {
      id: 'a',
      status: 'needs_review' as const,
      dueAt: '2026-02-20',
      lastActivityAt: '2026-02-10T00:00:00.000Z',
    };
    const b = {
      id: 'b',
      status: 'waiting_on_client' as const,
      dueAt: '2026-02-01',
      lastActivityAt: '2026-02-11T00:00:00.000Z',
    };

    expect(compareInboxRows(a, b)).toBeLessThan(0);
  });

  it('sorts by due date (earlier first) within same status', () => {
    const a = {
      id: 'a',
      status: 'waiting_on_client' as const,
      dueAt: '2026-02-10',
      lastActivityAt: '2026-02-10T00:00:00.000Z',
    };
    const b = {
      id: 'b',
      status: 'waiting_on_client' as const,
      dueAt: '2026-02-11',
      lastActivityAt: '2026-02-11T00:00:00.000Z',
    };

    expect(compareInboxRows(a, b)).toBeLessThan(0);
  });

  it('sorts by lastActivityAt (most recent first) as a tie-breaker', () => {
    const a = {
      id: 'a',
      status: 'waiting_on_client' as const,
      dueAt: '2026-02-10',
      lastActivityAt: '2026-02-10T00:00:00.000Z',
    };
    const b = {
      id: 'b',
      status: 'waiting_on_client' as const,
      dueAt: '2026-02-10',
      lastActivityAt: '2026-02-11T00:00:00.000Z',
    };

    expect(compareInboxRows(a, b)).toBeGreaterThan(0);
  });
});

