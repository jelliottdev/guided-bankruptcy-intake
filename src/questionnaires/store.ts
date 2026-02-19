import { scopedStorageKey } from '../state/clientScope';
import { createSeedAssignments } from './seeds/v3Assignments';
import { createSeedTemplates } from './seeds/v3Templates';
import { GUIDED_INTAKE_FIELD_COUNT, GUIDED_INTAKE_LEGACY_FIELD_IDS, GUIDED_INTAKE_STEP_COUNT } from './seeds/intakeGraph';
import type {
  DerivedAssignmentStage,
  NodeResponse,
  QuestionInputType,
  QuestionnaireAssignment,
  QuestionnaireAssignmentStatus,
  QuestionnaireEdge,
  QuestionnaireGraph,
  QuestionnaireNode,
  QuestionnaireNodeKind,
  QuestionnairePersistedStateV3,
  QuestionnaireTemplate,
} from './types';

const QUESTIONNAIRE_KEY_V3 = 'gbi:questionnaires:v3';
const QUESTIONNAIRE_KEY_V1 = 'gbi:questionnaires:v1';
const QUESTIONNAIRE_SCHEMA_VERSION = 3;

type LegacyV1State = {
  schemaVersion?: number;
  templates?: unknown[];
  assignments?: unknown[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nextUntitledTitle(base: string, takenTitles: Set<string>): string {
  const cleanBase = base.trim() || 'Untitled';
  if (!takenTitles.has(cleanBase)) return cleanBase;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${cleanBase} (${i})`;
    if (!takenTitles.has(candidate)) return candidate;
  }
  return `${cleanBase} (${Date.now()})`;
}

function needsCopyArtifactNormalization(title: string): boolean {
  const trimmed = title.trim();
  return /^Copy of\s+/i.test(trimmed) || /\s*\(Copy\)\s*$/i.test(trimmed);
}

// Exported for unit tests; used during load-time normalization to remove legacy auto-copy artifacts.
export function stripAutoCopyArtifacts(title: string): string {
  let next = title.trim();
  next = next.replace(/^Copy of\s+/i, '');
  next = next.replace(/\s*\(Copy\)\s*$/i, '');
  return next.trim();
}

// Exported for unit tests; keeps normalization pure and local-first.
export function normalizeTitles(input: {
  templates: QuestionnaireTemplate[];
  assignments: QuestionnaireAssignment[];
}): { templates: QuestionnaireTemplate[]; assignments: QuestionnaireAssignment[]; changed: boolean } {
  const { templates, assignments } = input;

  let templateChanged = false;
  let assignmentChanged = false;

  const templateNeeds = templates.map(
    (template) => template.createdBy === 'attorney' && needsCopyArtifactNormalization(template.title)
  );
  const takenTemplateTitles = new Set<string>();
  templates.forEach((template, idx) => {
    if (!templateNeeds[idx]) takenTemplateTitles.add(template.title);
  });
  const nextTemplates = templates.map((template, idx) => {
    if (!templateNeeds[idx]) return template;
    const base = stripAutoCopyArtifacts(template.title);
    const unique = nextUntitledTitle(base, takenTemplateTitles);
    takenTemplateTitles.add(unique);
    if (unique === template.title) return template;
    templateChanged = true;
    return { ...template, title: unique };
  });

  const assignmentNeeds = assignments.map((assignment) => needsCopyArtifactNormalization(assignment.title));
  const takenAssignmentTitles = new Set<string>();
  assignments.forEach((assignment, idx) => {
    if (!assignmentNeeds[idx]) takenAssignmentTitles.add(assignment.title);
  });
  const nextAssignments = assignments.map((assignment, idx) => {
    if (!assignmentNeeds[idx]) return assignment;
    const base = stripAutoCopyArtifacts(assignment.title);
    const unique = nextUntitledTitle(base, takenAssignmentTitles);
    takenAssignmentTitles.add(unique);
    if (unique === assignment.title) return assignment;
    assignmentChanged = true;
    return { ...assignment, title: unique };
  });

  const changed = templateChanged || assignmentChanged;
  return {
    templates: templateChanged ? nextTemplates : templates,
    assignments: assignmentChanged ? nextAssignments : assignments,
    changed,
  };
}

function defaultGraph(title = 'New questionnaire'): QuestionnaireGraph {
  const sectionId = randomId('section');
  const startId = randomId('start');
  const questionId = randomId('question');
  const endId = randomId('end');
  return {
    nodes: [
      {
        id: startId,
        kind: 'start',
        title: 'Start',
        clientVisible: false,
        labels: [],
        ui: { x: 80, y: 160 },
      },
      {
        id: sectionId,
        kind: 'section',
        title,
        clientVisible: true,
        labels: ['other'],
        ui: { x: 300, y: 140 },
      },
      {
        id: questionId,
        kind: 'question',
        title: 'New question',
        clientVisible: true,
        labels: ['other'],
        inputType: 'text',
        required: true,
        blocksWorkflow: false,
        sectionId,
        ui: { x: 520, y: 140 },
      },
      {
        id: endId,
        kind: 'end',
        title: 'End',
        clientVisible: false,
        labels: [],
        ui: { x: 740, y: 160 },
      },
    ],
    edges: [
      { id: randomId('edge'), from: startId, to: sectionId, when: { type: 'always' } },
      { id: randomId('edge'), from: sectionId, to: questionId, when: { type: 'always' } },
      { id: randomId('edge'), from: questionId, to: endId, when: { type: 'always' } },
    ],
  };
}

function normalizeGraphOrdering(graph: QuestionnaireGraph): QuestionnaireGraph {
  const SECTION_ITEM_KINDS = new Set<QuestionnaireNodeKind>([
    'question',
    'doc_request',
    'decision',
    'task',
    'approval_gate',
    'reminder',
    'note',
  ]);

  const sectionNodes = graph.nodes.filter((node) => node.kind === 'section');
  const sortedSections = [...sectionNodes].sort((a, b) => {
    const av = a.sectionOrder ?? a.order ?? a.ui?.y ?? 0;
    const bv = b.sectionOrder ?? b.order ?? b.ui?.y ?? 0;
    if (av !== bv) return av - bv;
    return a.id.localeCompare(b.id);
  });

  const sectionOrderById = new Map<string, number>();
  sortedSections.forEach((section, idx) => {
    sectionOrderById.set(section.id, (idx + 1) * 1000);
  });

  const orderById = new Map<string, number>();
  for (const section of sortedSections) {
    const items = graph.nodes
      .filter((node) => node.sectionId === section.id && SECTION_ITEM_KINDS.has(node.kind))
      .sort((a, b) => {
        const av = a.order ?? a.ui?.y ?? 0;
        const bv = b.order ?? b.ui?.y ?? 0;
        if (av !== bv) return av - bv;
        return a.id.localeCompare(b.id);
      });
    items.forEach((item, idx) => {
      orderById.set(item.id, (idx + 1) * 1000);
    });
  }

  let changed = false;
  const nextNodes = graph.nodes.map((node) => {
    if (node.kind === 'section') {
      const nextSectionOrder = sectionOrderById.get(node.id);
      if (nextSectionOrder != null && node.sectionOrder !== nextSectionOrder) {
        changed = true;
        return { ...node, sectionOrder: nextSectionOrder };
      }
      return node;
    }
    if (node.sectionId && orderById.has(node.id)) {
      const nextOrder = orderById.get(node.id) as number;
      if (node.order !== nextOrder) {
        changed = true;
        return { ...node, order: nextOrder };
      }
    }
    return node;
  });

  return changed ? { ...graph, nodes: nextNodes } : graph;
}

function isGraph(value: unknown): value is QuestionnaireGraph {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Array.isArray(item.nodes) && Array.isArray(item.edges);
}

function isTemplate(value: unknown): value is QuestionnaireTemplate {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.activeVersion === 'number' &&
    Array.isArray(item.versions)
  );
}

function isAssignment(value: unknown): value is QuestionnaireAssignment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.templateId === 'string' &&
    typeof item.templateVersion === 'number' &&
    typeof item.title === 'string'
  );
}

function isNodeResponse(value: unknown): value is NodeResponse {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.assignmentId === 'string' &&
    typeof item.nodeId === 'string' &&
    typeof item.updatedAt === 'string'
  );
}

function seedState(archivedV1?: unknown): QuestionnairePersistedStateV3 {
  const templates = createSeedTemplates();
  const assignments = createSeedAssignments(templates);
  return {
    schemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
    templates,
    assignments,
    responses: [],
    archivedV1,
  };
}

/** Deterministic empty/demo-ready state: seed templates + assignments, no responses. Used by Reset. */
export function getFreshQuestionnaireState(): QuestionnairePersistedStateV3 {
  return seedState();
}

function isHydratedIntakeTemplate(template: QuestionnaireTemplate | null): boolean {
  if (!template) return false;
  const version = template.versions.find((item) => item.version === template.activeVersion);
  if (!version) return false;
  const legacyFieldNodes = version.graph.nodes.filter(
    (node) => typeof node.legacyFieldId === 'string' && node.legacyFieldId.trim().length > 0
  );
  const sectionNodes = version.graph.nodes.filter((node) => node.kind === 'section');
  const graphFieldIds = new Set(legacyFieldNodes.map((n) => n.legacyFieldId as string));
  const hasAllFields = [...GUIDED_INTAKE_LEGACY_FIELD_IDS].every((id) => graphFieldIds.has(id));
  return (
    hasAllFields &&
    legacyFieldNodes.length >= GUIDED_INTAKE_FIELD_COUNT &&
    sectionNodes.length >= GUIDED_INTAKE_STEP_COUNT
  );
}

function normalizeStateForLatestIntake(
  templates: QuestionnaireTemplate[],
  assignments: QuestionnaireAssignment[],
  responses: NodeResponse[]
): Pick<QuestionnairePersistedStateV3, 'templates' | 'assignments' | 'responses'> {
  const seeded = createSeedTemplates();
  const seedIntake = seeded.find((template) => template.id === 'intake-default') ?? null;
  if (!seedIntake) return { templates, assignments, responses };

  let nextTemplates = templates;
  let nextAssignments = assignments;
  let nextResponses = responses;

  const currentIntake = templates.find((template) => template.id === 'intake-default') ?? null;
  if (!isHydratedIntakeTemplate(currentIntake)) {
    nextTemplates = [seedIntake, ...templates.filter((template) => template.id !== 'intake-default')];
    const replacedAssignmentIds = new Set(
      assignments.filter((assignment) => assignment.templateId === 'intake-default').map((assignment) => assignment.id)
    );
    nextAssignments = assignments.filter((assignment) => assignment.templateId !== 'intake-default');
    nextAssignments = assignTemplate(nextAssignments, seedIntake);
    nextResponses = responses.filter((response) => !replacedAssignmentIds.has(response.assignmentId));
  }

  return {
    templates: nextTemplates,
    assignments: nextAssignments,
    responses: nextResponses,
  };
}

function readLegacyV1State(): LegacyV1State | null {
  try {
    const raw = localStorage.getItem(scopedStorageKey(QUESTIONNAIRE_KEY_V1));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyV1State;
    return parsed;
  } catch {
    return null;
  }
}

export function loadQuestionnaireState(_defaultStepOrder?: string[]): QuestionnairePersistedStateV3 {
  try {
    const raw = localStorage.getItem(scopedStorageKey(QUESTIONNAIRE_KEY_V3));
    if (!raw) {
      const migrated = migrateQuestionnaireStateFromV1();
      saveQuestionnaireState(migrated);
      return migrated;
    }

    const parsed = JSON.parse(raw) as Partial<QuestionnairePersistedStateV3>;
    if (parsed?.schemaVersion !== QUESTIONNAIRE_SCHEMA_VERSION) {
      const migrated = migrateQuestionnaireStateFromV1();
      saveQuestionnaireState(migrated);
      return migrated;
    }

    const templates = Array.isArray(parsed.templates) ? parsed.templates.filter(isTemplate) : [];
    const assignments = Array.isArray(parsed.assignments) ? parsed.assignments.filter(isAssignment) : [];
    const responses = Array.isArray(parsed.responses) ? parsed.responses.filter(isNodeResponse) : [];

    if (templates.length === 0) {
      const migrated = migrateQuestionnaireStateFromV1();
      saveQuestionnaireState(migrated);
      return migrated;
    }

    const normalized = normalizeStateForLatestIntake(templates, assignments, responses);
    const titleNormalized = normalizeTitles({
      templates: normalized.templates,
      assignments: normalized.assignments,
    });
    const nextState: QuestionnairePersistedStateV3 = {
      schemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
      templates: titleNormalized.templates,
      assignments: titleNormalized.assignments,
      responses: normalized.responses,
      archivedV1: parsed.archivedV1,
    };
    if (
      normalized.templates !== templates ||
      normalized.assignments !== assignments ||
      normalized.responses !== responses ||
      titleNormalized.changed
    ) {
      saveQuestionnaireState(nextState);
    }
    return nextState;
  } catch {
    const migrated = migrateQuestionnaireStateFromV1();
    saveQuestionnaireState(migrated);
    return migrated;
  }
}

export function migrateQuestionnaireStateFromV1(): QuestionnairePersistedStateV3 {
  const legacy = readLegacyV1State();
  if (!legacy) return seedState();
  return seedState(legacy);
}

export function saveQuestionnaireState(state: QuestionnairePersistedStateV3): void {
  try {
    localStorage.setItem(scopedStorageKey(QUESTIONNAIRE_KEY_V3), JSON.stringify(state));
  } catch {
    // non-fatal for local demo
  }
}

export function findTemplate(
  templates: QuestionnaireTemplate[],
  templateId: string
): QuestionnaireTemplate | null {
  return templates.find((item) => item.id === templateId) ?? null;
}

export function findTemplateVersion(template: QuestionnaireTemplate, version: number) {
  return template.versions.find((item) => item.version === version) ?? null;
}

export function createQuestionnaireTemplate(
  templates: QuestionnaireTemplate[],
  input: { title: string; description?: string }
): QuestionnaireTemplate[] {
  const ts = nowIso();
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) return templates;

  const next: QuestionnaireTemplate = {
    id: randomId('qtpl'),
    title: trimmedTitle,
    description: input.description?.trim() || 'Custom questionnaire',
    scope: 'firm',
    kind: 'custom',
    isDefault: false,
    createdBy: 'attorney',
    createdAt: ts,
    updatedAt: ts,
    activeVersion: 1,
    versions: [
      {
        version: 1,
        graph: defaultGraph(trimmedTitle),
      },
    ],
  };

  return [next, ...templates];
}

export function duplicateQuestionnaireTemplate(
  templates: QuestionnaireTemplate[],
  templateId: string
): QuestionnaireTemplate[] {
  const source = findTemplate(templates, templateId);
  if (!source) return templates;

  const ts = nowIso();
  const taken = new Set(templates.map((template) => template.title));
  const clone: QuestionnaireTemplate = {
    ...source,
    id: randomId('qtpl'),
    title: nextUntitledTitle(source.title, taken),
    isDefault: false,
    kind: 'custom',
    createdBy: 'attorney',
    createdAt: ts,
    updatedAt: ts,
    versions: source.versions.map((version) => ({
      ...version,
      graph: {
        nodes: version.graph.nodes.map((node) => ({ ...node })),
        edges: version.graph.edges.map((edge) => ({ ...edge, when: { ...edge.when } })),
      },
    })),
  };

  return [clone, ...templates];
}

export function cloneTemplateForEdit(
  templates: QuestionnaireTemplate[],
  templateId: string
): { templates: QuestionnaireTemplate[]; editableTemplateId: string } {
  const source = findTemplate(templates, templateId);
  if (!source) return { templates, editableTemplateId: templateId };

  if (!source.isDefault && source.createdBy !== 'system') {
    return { templates, editableTemplateId: source.id };
  }

  const nextTemplates = duplicateQuestionnaireTemplate(templates, templateId);
  return { templates: nextTemplates, editableTemplateId: nextTemplates[0]?.id ?? templateId };
}

export function archiveQuestionnaireTemplate(
  templates: QuestionnaireTemplate[],
  templateId: string
): QuestionnaireTemplate[] {
  return templates.map((template) =>
    template.id === templateId && !template.isDefault
      ? {
          ...template,
          archived: true,
          updatedAt: nowIso(),
        }
      : template
  );
}

export function updateTemplateGraph(
  templates: QuestionnaireTemplate[],
  templateId: string,
  graph: QuestionnaireGraph
): QuestionnaireTemplate[] {
  const normalizedGraph = normalizeGraphOrdering(graph);
  return templates.map((template) => {
    if (template.id !== templateId) return template;
    const activeVersion = findTemplateVersion(template, template.activeVersion);
    if (!activeVersion) return template;
    if (!isGraph(normalizedGraph)) return template;

    // Published versions are immutable for defensibility. If the active version is already published,
    // bump to a new draft version before applying edits.
    if (activeVersion.publishedAt) {
      const nextVersion = Math.max(...template.versions.map((item) => item.version), 0) + 1;
      return {
        ...template,
        updatedAt: nowIso(),
        activeVersion: nextVersion,
        versions: [
          ...template.versions,
          {
            version: nextVersion,
            graph: normalizedGraph,
          },
        ],
      };
    }

    return {
      ...template,
      updatedAt: nowIso(),
      versions: template.versions.map((version) =>
        version.version === template.activeVersion
          ? {
              ...version,
              graph: normalizedGraph,
            }
          : version
      ),
    };
  });
}

export function publishTemplateVersion(
  templates: QuestionnaireTemplate[],
  templateId: string,
  input?: { notes?: string; by?: 'attorney' | 'staff' | 'system' }
): QuestionnaireTemplate[] {
  return templates.map((template) => {
    if (template.id !== templateId) return template;
    const current = findTemplateVersion(template, template.activeVersion);
    if (!current) return template;
    const nextVersion = Math.max(...template.versions.map((item) => item.version), 0) + 1;
    return {
      ...template,
      updatedAt: nowIso(),
      activeVersion: nextVersion,
      versions: [
        ...template.versions,
        {
          version: nextVersion,
          graph: {
            nodes: current.graph.nodes.map((node) => ({ ...node })),
            edges: current.graph.edges.map((edge) => ({ ...edge, when: { ...edge.when } })),
          },
          publishedAt: nowIso(),
          publishedBy: input?.by ?? 'attorney',
          notes: input?.notes,
        },
      ],
    };
  });
}

export function assignTemplate(
  assignments: QuestionnaireAssignment[],
  template: QuestionnaireTemplate,
  dueAt?: string,
  titleOverride?: string
): QuestionnaireAssignment[] {
  const nextTitle = titleOverride?.trim() || template.title;
  const next: QuestionnaireAssignment = {
    id: randomId('assign'),
    templateId: template.id,
    templateVersion: template.activeVersion,
    title: nextTitle,
    assignedAt: nowIso(),
    assignedBy: 'attorney',
    dueAt: dueAt?.trim() || undefined,
    computedStage: 'assigned',
  };
  return [next, ...assignments];
}

export function updateAssignmentComputedStage(
  assignments: QuestionnaireAssignment[],
  assignmentId: string,
  stage: DerivedAssignmentStage
): QuestionnaireAssignment[] {
  return assignments.map((assignment) =>
    assignment.id === assignmentId
      ? {
          ...assignment,
          computedStage: stage,
        }
      : assignment
  );
}

// Legacy helper retained for current UI until full v4 migration lands.
export function updateAssignmentStatus(
  assignments: QuestionnaireAssignment[],
  assignmentId: string,
  status: QuestionnaireAssignmentStatus
): QuestionnaireAssignment[] {
  const mapped: DerivedAssignmentStage =
    status === 'completed' ? 'submitted' : status === 'in_progress' ? 'in_progress' : 'assigned';
  return updateAssignmentComputedStage(assignments, assignmentId, mapped);
}

export function listActiveTemplates(templates: QuestionnaireTemplate[]): QuestionnaireTemplate[] {
  return templates.filter((template) => !template.archived);
}

export function upsertNodeResponse(
  responses: NodeResponse[],
  input: {
    assignmentId: string;
    nodeId: string;
    value?: NodeResponse['value'];
    skipped?: NodeResponse['skipped'];
  }
): NodeResponse[] {
  const ts = nowIso();
  const next: NodeResponse = {
    assignmentId: input.assignmentId,
    nodeId: input.nodeId,
    value: input.value,
    skipped: input.skipped,
    updatedAt: ts,
  };

  const idx = responses.findIndex(
    (item) => item.assignmentId === input.assignmentId && item.nodeId === input.nodeId
  );
  if (idx < 0) return [...responses, next];
  const copy = [...responses];
  copy[idx] = next;
  return copy;
}

export function clearAssignmentResponses(
  responses: NodeResponse[],
  assignmentId: string
): NodeResponse[] {
  return responses.filter((item) => item.assignmentId !== assignmentId);
}

export function responsesForAssignment(
  responses: NodeResponse[],
  assignmentId: string
): NodeResponse[] {
  return responses.filter((item) => item.assignmentId === assignmentId);
}

export function createGraphNode(
  kind: QuestionnaireNodeKind,
  input?: Partial<QuestionnaireNode>
): QuestionnaireNode {
  const baseInputType = defaultInputTypeForKind(kind);
  return {
    id: randomId('node'),
    kind,
    title: input?.title ?? defaultNodeTitle(kind),
    helpText: input?.helpText,
    placeholder: input?.placeholder,
    clientVisible:
      input?.clientVisible ??
      (kind !== 'start' && kind !== 'end' && kind !== 'note'),
    labels: input?.labels ?? (kind === 'question' || kind === 'doc_request' || kind === 'decision' ? ['other'] : []),
    customTags: input?.customTags,
    inputType: input?.inputType ?? baseInputType,
    required: input?.required ?? (kind === 'question' || kind === 'doc_request' || kind === 'decision'),
    blocksWorkflow: input?.blocksWorkflow ?? false,
    options: input?.options,
    rows: input?.rows,
    columns: input?.columns,
    fileRules: input?.fileRules,
    sectionId: input?.sectionId,
    legacyStepId: input?.legacyStepId,
    legacyFieldId: input?.legacyFieldId,
    ui: input?.ui,
  };
}

export function createGraphEdge(input: {
  from: string;
  to: string;
  when?: QuestionnaireEdge['when'];
}): QuestionnaireEdge {
  return {
    id: randomId('edge'),
    from: input.from,
    to: input.to,
    when: input.when ?? { type: 'always' },
  };
}

function defaultNodeTitle(kind: QuestionnaireNodeKind): string {
  if (kind === 'start') return 'Start';
  if (kind === 'section') return 'Section';
  if (kind === 'question') return 'New question';
  if (kind === 'decision') return 'Decision';
  if (kind === 'doc_request') return 'Document request';
  if (kind === 'task') return 'Task';
  if (kind === 'approval_gate') return 'Approval gate';
  if (kind === 'reminder') return 'Reminder';
  if (kind === 'end') return 'End';
  return 'Note';
}

function defaultInputTypeForKind(kind: QuestionnaireNodeKind): QuestionInputType | undefined {
  if (kind === 'question') return 'text';
  if (kind === 'decision') return 'yes_no';
  if (kind === 'doc_request') return 'file_upload';
  return undefined;
}

export type QuestionnaireState = QuestionnairePersistedStateV3;
