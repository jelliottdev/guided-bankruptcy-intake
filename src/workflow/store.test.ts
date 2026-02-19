import { describe, expect, it } from 'vitest';
import {
  buildDerivedTaskActionable,
  setActionableDue,
  setActionableResponsible,
  transitionWorkspaceActionable,
  upsertActionable,
  type WorkspaceStateV2,
} from './store';

function emptyWorkspace(): WorkspaceStateV2 {
  return {
    actionables: [],
    threads: [],
    documentsMeta: [],
    appointments: [],
    audit: [],
  };
}

describe('workspace store', () => {
  it('upserts and transitions actionable entries', () => {
    const task = buildDerivedTaskActionable({
      id: 'task:1',
      title: 'Collect missing field',
      description: 'Missing required field',
      severity: 'high',
    });
    const inserted = upsertActionable(emptyWorkspace(), task, 'system');
    expect(inserted.actionables.length).toBe(1);
    const transitioned = transitionWorkspaceActionable(inserted, task.id, 'waiting_on_client', 'attorney');
    expect(transitioned.actionables[0].status).toBe('waiting_on_client');
    expect(transitioned.actionables[0].responsible).toBe('client');
    expect(transitioned.actionables[0].audit[transitioned.actionables[0].audit.length - 1]?.action).toBe('status_changed');
  });

  it('updates responsible and due metadata', () => {
    const task = buildDerivedTaskActionable({
      id: 'task:2',
      title: 'Verify creditor',
      description: 'Needs staff review',
      severity: 'normal',
    });
    const inserted = upsertActionable(emptyWorkspace(), task, 'system');
    const assigned = setActionableResponsible(inserted, task.id, 'staff', 'attorney');
    expect(assigned.actionables[0].responsible).toBe('staff');
    const dueSet = setActionableDue(assigned, task.id, 'target', '2026-02-20', 'attorney');
    expect(dueSet.actionables[0].dueKind).toBe('target');
    expect(dueSet.actionables[0].dueAt).toBe('2026-02-20');
  });

  it('rejects terminal transitions requiring rationale when note is missing', () => {
    const task = buildDerivedTaskActionable({
      id: 'task:3',
      title: 'Close obsolete request',
      description: 'No longer needed',
      severity: 'low',
    });
    const inserted = upsertActionable(emptyWorkspace(), task, 'system');
    const blocked = transitionWorkspaceActionable(inserted, task.id, 'dismissed', 'attorney');
    expect(blocked.actionables[0].status).toBe('open');
  });
});
