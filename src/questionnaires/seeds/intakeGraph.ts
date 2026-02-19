import { ALL_STEPS } from '../../form/steps';
import type { Field, Step } from '../../form/types';
import type {
  FilingLabel,
  QuestionInputType,
  QuestionnaireEdge,
  QuestionnaireGraph,
  QuestionnaireNode,
} from '../types';

const DEFAULT_UPLOAD_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
] as const;

export const GUIDED_INTAKE_STEP_COUNT = ALL_STEPS.length;
export const GUIDED_INTAKE_FIELD_COUNT = ALL_STEPS.reduce(
  (sum, step) => sum + step.fields.length,
  0
);

/** Set of every form field id (legacyFieldId) the intake graph must have. Used to detect stale templates missing fields (e.g. upload_mortgage_docs). */
export const GUIDED_INTAKE_LEGACY_FIELD_IDS = new Set(
  ALL_STEPS.flatMap((step) => step.fields.map((f) => f.id))
);

const STEP_LABELS: Record<string, FilingLabel[]> = {
  filing: ['identity_household'],
  identity: ['identity_household'],
  contact: ['identity_household'],
  spouse: ['identity_household'],
  urgency: ['legal_actions', 'sofa'],
  real_estate: ['assets', 'schedule_a_b', 'schedule_d'],
  bank_accounts: ['assets', 'schedule_a_b'],
  security_deposits: ['assets', 'schedule_a_b'],
  household_property: ['assets', 'schedule_a_b', 'exemptions'],
  valuables: ['assets', 'schedule_a_b', 'exemptions'],
  financial_assets: ['assets', 'schedule_a_b'],
  vehicles: ['assets', 'schedule_a_b', 'schedule_d', 'exemptions'],
  other_secured: ['debts_secured', 'schedule_d'],
  priority_debts: ['debts_unsecured', 'schedule_e_f'],
  unsecured: ['debts_unsecured', 'schedule_e_f'],
  leases: ['sofa'],
  income: ['income', 'schedule_i_j'],
  expenses: ['expenses', 'schedule_i_j'],
  income_history: ['income', 'sofa'],
  documents: ['documents'],
  recent_activity: ['sofa', 'legal_actions'],
  final_review: ['other'],
};

function mapFieldInputType(field: Field): QuestionInputType {
  if (field.type === 'textarea') return 'textarea';
  if (field.type === 'email') return 'email';
  if (field.type === 'date') return 'date';
  if (field.type === 'radio') return 'single_select';
  if (field.type === 'checkbox') return 'multi_select';
  if (field.type === 'select') return 'single_select';
  if (field.type === 'grid') return 'grid';
  if (field.type === 'file') return 'file_upload';
  return 'text';
}

function mapFieldLabels(stepId: string, field: Field): FilingLabel[] {
  const labels = [...(STEP_LABELS[stepId] ?? ['other'])];
  if (field.type === 'file' && !labels.includes('documents')) {
    labels.push('documents');
  }
  return labels;
}

function mapFieldHelp(field: Field): string | undefined {
  const parts: string[] = [];
  if (field.helper) parts.push(field.helper.trim());
  if (field.helper) parts.push(field.helper.trim());
  if (field.uploadForTag) parts.push(`Upload for: ${field.uploadForTag.trim()}`);
  if (field.dateRangeRequested) parts.push(`Date range: ${field.dateRangeRequested.trim()}`);
  if (field.uploadAppliesTo) parts.push(`Applies to: ${field.uploadAppliesTo.trim()}`);
  if (field.examples) parts.push(`Examples: ${field.examples.trim()}`);
  if (field.requestedDocsList && field.requestedDocsList.length > 0) {
    parts.push(`Requested docs: ${field.requestedDocsList.join('; ')}`);
  }
  if (field.acceptedAlternatives && field.acceptedAlternatives.length > 0) {
    parts.push(`Accepted alternatives: ${field.acceptedAlternatives.join('; ')}`);
  }
  if (field.doNotUpload) parts.push(`Do not upload: ${field.doNotUpload.trim()}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function sectionNode(step: Step, stepIndex: number): QuestionnaireNode {
  return {
    id: `sec-${sanitizeId(step.id)}`,
    kind: 'section',
    title: step.title,
    helpText: step.description || step.reassurance || undefined,
    clientVisible: true,
    labels: STEP_LABELS[step.id] ?? ['other'],
    blocksWorkflow: false,
    legacyStepId: step.id,
    ui: {
      x: 220 + stepIndex * 460,
      y: 80,
    },
  };
}

function fieldNode(step: Step, field: Field, stepIndex: number, fieldIndex: number): QuestionnaireNode {
  const localCol = Math.floor(fieldIndex / 8);
  const localRow = fieldIndex % 8;
  const sectionId = `sec-${sanitizeId(step.id)}`;

  const baseNode: QuestionnaireNode = {
    id: `node-${sanitizeId(field.id)}`,
    kind: field.type === 'file' ? 'doc_request' : 'question',
    title: field.label.replace(/\*/g, '').trim(),
    helpText: mapFieldHelp(field),
    whyWeAsk: field.whyWeAsk,
    placeholder: field.placeholder,
    clientVisible: true,
    labels: mapFieldLabels(step.id, field),
    inputType: mapFieldInputType(field),
    required: Boolean(field.required),
    blocksWorkflow: Boolean(field.required || field.resolutionRequired),
    options: field.options?.map((option) => ({ id: option.value, label: option.label })),
    rows: field.rows?.map((row) => ({ id: row.id, label: row.label })),
    columns: field.columns?.map((column) => ({ id: column.id, label: column.label })),
    fileRules:
      field.type === 'file'
        ? {
          minFiles: field.required ? 1 : undefined,
          allowedMime: [...DEFAULT_UPLOAD_MIME],
          maxSizeMb: 25,
        }
        : undefined,
    sectionId,
    legacyStepId: step.id,
    legacyFieldId: field.id,
    ui: {
      x: 220 + stepIndex * 460 + localCol * 250,
      y: 210 + localRow * 130,
    },
  };

  return baseNode;
}

function edge(from: string, to: string): QuestionnaireEdge {
  return {
    id: `edge-${sanitizeId(from)}-${sanitizeId(to)}`,
    from,
    to,
    when: { type: 'always' },
  };
}

export function buildGuidedIntakeGraph(): QuestionnaireGraph {
  const nodes: QuestionnaireNode[] = [
    {
      id: 'start',
      kind: 'start',
      title: 'Start',
      clientVisible: false,
      labels: [],
      ui: { x: 40, y: 110 },
    },
  ];
  const edges: QuestionnaireEdge[] = [];
  let previousNodeId = 'start';

  ALL_STEPS.forEach((step, stepIndex) => {
    const stepSection = sectionNode(step, stepIndex);
    nodes.push(stepSection);
    edges.push(edge(previousNodeId, stepSection.id));
    previousNodeId = stepSection.id;

    step.fields.forEach((field, fieldIndex) => {
      const nextNode = fieldNode(step, field, stepIndex, fieldIndex);
      nodes.push(nextNode);
      edges.push(edge(previousNodeId, nextNode.id));
      previousNodeId = nextNode.id;
    });
  });

  const endNode: QuestionnaireNode = {
    id: 'end',
    kind: 'end',
    title: 'End',
    clientVisible: false,
    labels: [],
    ui: { x: 220 + ALL_STEPS.length * 460, y: 110 },
  };
  nodes.push(endNode);
  edges.push(edge(previousNodeId, endNode.id));

  return { nodes, edges };
}
