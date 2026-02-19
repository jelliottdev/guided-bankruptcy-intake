import type { AttorneyWorkspaceTab } from './types';
import { ATTORNEY_WORKSPACE_TABS } from './types';

const DEFAULT_ATTORNEY_TAB: AttorneyWorkspaceTab = 'today';
const LEGACY_WORKFLOW_TABS = new Set(['documents', 'action_queue', 'risks', 'financial', 'scheduling']);

export function isAttorneyWorkspaceTab(value: string | null | undefined): value is AttorneyWorkspaceTab {
  if (!value) return false;
  return (ATTORNEY_WORKSPACE_TABS as readonly string[]).includes(value);
}

export function normalizeAttorneyWorkspaceTab(value: string | null | undefined): AttorneyWorkspaceTab {
  if (isAttorneyWorkspaceTab(value)) return value;
  if (value && LEGACY_WORKFLOW_TABS.has(value)) return 'blockers';
  return DEFAULT_ATTORNEY_TAB;
}

export function readInitialAttorneyWorkspaceTab(search: string): AttorneyWorkspaceTab {
  const params = new URLSearchParams(search);
  return normalizeAttorneyWorkspaceTab(params.get('workspaceTab'));
}

export function writeAttorneyWorkspaceTab(tab: AttorneyWorkspaceTab): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('workspaceTab', tab);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', next);
}
