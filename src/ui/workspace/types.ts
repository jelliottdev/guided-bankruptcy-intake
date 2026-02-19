export type AttorneyWorkspaceTab =
  | 'today'
  | 'questionnaires'
  | 'blockers'
  | 'documents'
  | 'action_queue'
  | 'risks'
  | 'financial'
  | 'messages'
  | 'scheduling'
  | 'settings';

export const ATTORNEY_WORKSPACE_TABS: readonly AttorneyWorkspaceTab[] = [
  'today',
  'blockers',
  'questionnaires',
  'messages',
  'settings',
] as const;

export const ATTORNEY_WORKSPACE_TAB_LABELS: Record<AttorneyWorkspaceTab, string> = {
  today: 'Case Overview',
  questionnaires: 'Assignments',
  blockers: 'Workflow',
  documents: 'Documents',
  action_queue: 'Action Queue',
  risks: 'Risks',
  financial: 'Financial',
  messages: 'Messages',
  scheduling: 'Scheduling',
  settings: 'Settings',
};
