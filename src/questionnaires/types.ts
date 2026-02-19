export type QuestionnaireKind = 'intake' | 'custom';
// Legacy alias kept temporarily while v4 migration is in progress.
export type CustomQuestionKind = 'text' | 'textarea' | 'file';

export type QuestionnaireNodeKind =
  | 'start'
  | 'section'
  | 'question'
  | 'decision'
  | 'doc_request'
  | 'task'
  | 'approval_gate'
  | 'reminder'
  | 'end'
  | 'note';

export type QuestionInputType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'date'
  | 'yes_no'
  | 'single_select'
  | 'multi_select'
  | 'grid'
  | 'file_upload';

export type FilingLabel =
  | 'identity_household'
  | 'income'
  | 'expenses'
  | 'assets'
  | 'debts_secured'
  | 'debts_unsecured'
  | 'schedule_a_b'
  | 'schedule_c'
  | 'schedule_d'
  | 'schedule_e_f'
  | 'schedule_i_j'
  | 'sofa'
  | 'exemptions'
  | 'legal_actions'
  | 'documents'
  | 'other';

export type NodeConditionType =
  | 'always'
  | 'yes'
  | 'no'
  | 'choice_equals'
  | 'choice_contains'
  | 'exists';

export interface QuestionnaireNode {
  id: string;
  kind: QuestionnaireNodeKind;
  title: string;
  helpText?: string;
  whyWeAsk?: string;
  placeholder?: string;
  clientVisible: boolean;
  labels: FilingLabel[];
  customTags?: string[];
  inputType?: QuestionInputType;
  required?: boolean;
  blocksWorkflow?: boolean;
  options?: Array<{ id: string; label: string }>;
  rows?: Array<{ id: string; label: string }>;
  columns?: Array<{ id: string; label: string }>;
  fileRules?: { minFiles?: number; allowedMime?: string[]; maxSizeMb?: number };
  sectionId?: string;
  /** Stable ordering within a section. Falls back to ui.y when absent. */
  order?: number;
  /** Stable ordering among sections. Falls back to ui.y when absent. */
  sectionOrder?: number;
  legacyStepId?: string;
  legacyFieldId?: string;
  ui?: { x: number; y: number };
}

export interface QuestionnaireEdge {
  id: string;
  from: string;
  to: string;
  when: { type: NodeConditionType; optionId?: string };
}

export interface QuestionnaireGraph {
  nodes: QuestionnaireNode[];
  edges: QuestionnaireEdge[];
}

export interface QuestionnaireTemplateVersion {
  version: number;
  graph: QuestionnaireGraph;
  publishedAt?: string;
  publishedBy?: 'attorney' | 'staff' | 'system';
  notes?: string;
}

export interface QuestionnaireTemplate {
  id: string;
  title: string;
  description: string;
  scope: 'firm';
  kind: QuestionnaireKind;
  isDefault: boolean;
  createdBy: 'system' | 'attorney';
  createdAt: string;
  updatedAt: string;
  activeVersion: number;
  versions: QuestionnaireTemplateVersion[];
  archived?: boolean;
}

export type DerivedAssignmentStage =
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'needs_review'
  | 'approved'
  | 'closed';

export interface QuestionnaireAssignment {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  assignedAt: string;
  assignedBy: 'attorney';
  dueAt?: string;
  computedStage?: DerivedAssignmentStage;
}

// Legacy alias kept temporarily while v4 migration is in progress.
export type QuestionnaireAssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export type ResponseValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string>
  | {
    files: Array<{
      id: string;
      name: string;
      uploadedAt: string;
      mimeType?: string;
      sizeBytes?: number;
      blobKey?: string;
    }>;
  };

export interface NodeResponse {
  assignmentId: string;
  nodeId: string;
  value?: ResponseValue;
  skipped?: { reason: string; by: 'client' | 'attorney'; at: string };
  updatedAt: string;
}

export interface QuestionnairePersistedStateV3 {
  schemaVersion: 3;
  templates: QuestionnaireTemplate[];
  assignments: QuestionnaireAssignment[];
  responses: NodeResponse[];
  archivedV1?: unknown;
}
