import { describe, expect, it } from 'vitest';
import { ATTORNEY_WORKSPACE_TABS } from './types';
import { normalizeAttorneyWorkspaceTab, readInitialAttorneyWorkspaceTab } from './tabState';

describe('workspace tab state', () => {
  it('defaults to today when value is invalid', () => {
    expect(normalizeAttorneyWorkspaceTab('garbage')).toBe('today');
    expect(normalizeAttorneyWorkspaceTab(null)).toBe('today');
  });

  it('maps legacy deep-link tabs into workflow', () => {
    expect(normalizeAttorneyWorkspaceTab('documents')).toBe('blockers');
    expect(normalizeAttorneyWorkspaceTab('financial')).toBe('blockers');
  });

  it('accepts valid tabs', () => {
    expect(normalizeAttorneyWorkspaceTab('blockers')).toBe('blockers');
    expect(normalizeAttorneyWorkspaceTab('messages')).toBe('messages');
  });

  it('parses query string and falls back to today', () => {
    expect(readInitialAttorneyWorkspaceTab('?workspaceTab=questionnaires')).toBe('questionnaires');
    expect(readInitialAttorneyWorkspaceTab('?workspaceTab=oops')).toBe('today');
  });

  it('one_active_tab invariant can always be satisfied', () => {
    expect(new Set(ATTORNEY_WORKSPACE_TABS).size).toBe(ATTORNEY_WORKSPACE_TABS.length);
    for (const active of ATTORNEY_WORKSPACE_TABS) {
      const selected = ATTORNEY_WORKSPACE_TABS.filter((tab) => tab === active);
      expect(selected).toHaveLength(1);
    }
  });
});
