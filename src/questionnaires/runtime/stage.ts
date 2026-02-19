import type {
  DerivedAssignmentStage,
  NodeResponse,
  QuestionnaireAssignment,
  QuestionnaireNode,
  QuestionnaireTemplate,
} from '../types';
import { buildLegacyAnswersFromResponses, evaluateNodeVisibility } from './evaluateVisibility';

const STAGE_ORDER: DerivedAssignmentStage[] = [
  'assigned',
  'in_progress',
  'submitted',
  'needs_review',
  'approved',
  'closed',
];

export function getStageRank(stage: DerivedAssignmentStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx < 0 ? 0 : idx;
}

export function stageLabel(stage: DerivedAssignmentStage): string {
  return stage.replace(/_/g, ' ');
}

export interface AssignmentProgress {
  total: number;
  completed: number;
  percent: number;
  stage: DerivedAssignmentStage;
}

export function deriveAssignmentProgress(
  assignment: QuestionnaireAssignment,
  template: QuestionnaireTemplate | null,
  responses: NodeResponse[]
): AssignmentProgress {
  if (!template) {
    return {
      total: 0,
      completed: 0,
      percent: 0,
      stage: assignment.computedStage ?? 'assigned',
    };
  }

  const version = template.versions.find((item) => item.version === assignment.templateVersion);
  if (!version) {
    return {
      total: 0,
      completed: 0,
      percent: 0,
      stage: assignment.computedStage ?? 'assigned',
    };
  }

  const responseByNodeId = new Map(
    responses.filter((item) => item.assignmentId === assignment.id).map((item) => [item.nodeId, item])
  );
  const legacyAnswers = buildLegacyAnswersFromResponses(version.graph, responseByNodeId);
  const clientNodes = version.graph.nodes.filter(
    (node) =>
      isClientProgressNode(node) &&
      evaluateNodeVisibility(node, version.graph, responseByNodeId, legacyAnswers)
  );
  if (clientNodes.length === 0) {
    return {
      total: 0,
      completed: 0,
      percent: 100,
      stage: 'submitted',
    };
  }

  let completed = 0;
  for (const node of clientNodes) {
    const response = responseByNodeId.get(node.id);
    if (hasResponseValue(response)) completed += 1;
  }

  const percent = Math.round((completed / clientNodes.length) * 100);

  let stage: DerivedAssignmentStage;
  if (completed <= 0) stage = 'assigned';
  else if (completed < clientNodes.length) stage = 'in_progress';
  else stage = 'submitted';

  if (assignment.computedStage && getStageRank(assignment.computedStage) > getStageRank(stage)) {
    stage = assignment.computedStage;
  }

  return {
    total: clientNodes.length,
    completed,
    percent,
    stage,
  };
}

function isClientProgressNode(node: QuestionnaireNode): boolean {
  if (!node.clientVisible) return false;
  if (node.kind === 'section' || node.kind === 'start' || node.kind === 'end' || node.kind === 'note') return false;
  return true;
}

function hasResponseValue(response: NodeResponse | undefined): boolean {
  if (!response) return false;
  if (response.skipped) return true;
  const value = response.value;
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && 'files' in value) return Array.isArray(value.files) && value.files.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}
