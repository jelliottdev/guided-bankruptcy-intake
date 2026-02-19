import { describe, expect, it } from 'vitest';
import {
  canEditOwner,
  canTransition,
  deriveResponsible,
  isTerminalStatus,
  isStatusForKind,
  transitionActionable,
  type Actionable,
} from './actionables';

function buildTask(): Actionable<'task'> {
  return {
    id: 'a-1',
    kind: 'task',
    title: 'Task',
    description: 'Task description',
    owner: 'attorney',
    responsible: 'attorney',
    severity: 'high',
    dueKind: 'sla',
    status: 'open',
    links: [],
    audit: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildQuestion(): Actionable<'question'> {
  return {
    id: 'q-1',
    kind: 'question',
    title: 'Question',
    description: 'Clarify income source',
    owner: 'client',
    responsible: 'client',
    severity: 'normal',
    dueKind: 'target',
    status: 'unassigned',
    links: [],
    audit: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('workflow invariants', () => {
  it('responsible matches waiting state', () => {
    expect(deriveResponsible('task', 'waiting_on_client')).toBe('client');
    expect(deriveResponsible('task', 'waiting_on_staff')).toBe('staff');
    expect(deriveResponsible('task', 'needs_attorney')).toBe('attorney');
  });

  it('terminal status helper is correct for task', () => {
    expect(isTerminalStatus('task', 'open')).toBe(false);
    expect(isTerminalStatus('task', 'done')).toBe(true);
  });

  it('invalid transition is rejected', () => {
    const base = buildTask();
    expect(canTransition('client', 'task', 'open', 'done')).toBe(false);
    const result = transitionActionable(base, 'done', { actorRole: 'client' });
    expect(result.ok).toBe(false);
    expect(result.value.status).toBe('open');
  });

  it('invalid transition by kind is rejected', () => {
    const base = buildTask();
    expect(isStatusForKind('task', 'received_sufficient')).toBe(false);
    const result = transitionActionable(base, 'received_sufficient' as never, { actorRole: 'attorney' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Invalid status/);
  });

  it('invalid transition sequence is rejected', () => {
    const question = buildQuestion();
    const result = transitionActionable(question, 'resolved', { actorRole: 'attorney' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Invalid status transition/);
  });

  it('audit is written on transition', () => {
    const base = buildTask();
    const result = transitionActionable(base, 'waiting_on_client', { actorRole: 'attorney' });
    expect(result.ok).toBe(true);
    expect(result.value.status).toBe('waiting_on_client');
    expect(result.value.responsible).toBe('client');
    expect(result.value.audit.length).toBe(1);
    expect(result.value.audit[0].action).toBe('status_changed');
  });

  it('terminal transitions attach resolution metadata', () => {
    const base = buildTask();
    const result = transitionActionable(base, 'done', { actorRole: 'attorney' });
    expect(result.ok).toBe(true);
    expect(result.value.status).toBe('done');
    expect(result.value.resolution?.outcome).toBe('done');
    expect(result.value.resolution?.resolvedBy).toBe('attorney');
    expect(result.value.resolution?.resolutionReasonCode).toBe('completed');
  });

  it('terminal statuses requiring rationale note are rejected without note', () => {
    const base = buildTask();
    const blocked = transitionActionable(base, 'dismissed', { actorRole: 'attorney' });
    expect(blocked.ok).toBe(false);
    const allowed = transitionActionable(base, 'dismissed', {
      actorRole: 'attorney',
      resolution: {
        outcome: 'dismissed',
        note: 'No longer applicable after updated filing strategy.',
      },
    });
    expect(allowed.ok).toBe(true);
    expect(allowed.value.resolution?.note).toContain('No longer applicable');
  });

  it('owner edit permissions are role constrained', () => {
    expect(canEditOwner('attorney', 'doc_request')).toBe(true);
    expect(canEditOwner('staff', 'question')).toBe(false);
    expect(canEditOwner('client', 'task')).toBe(false);
  });
});
