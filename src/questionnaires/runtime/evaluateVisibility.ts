import { ALL_STEPS } from '../../form/steps';
import type { Answers, FieldValue } from '../../form/types';
import type { NodeResponse, QuestionnaireGraph, QuestionnaireNode } from '../types';

export function evaluateNodeVisibility(
  node: QuestionnaireNode,
  graph: QuestionnaireGraph,
  responseByNodeId: Map<string, NodeResponse>,
  legacyAnswers?: Answers
): boolean {
  const answers = legacyAnswers ?? buildLegacyAnswersFromResponses(graph, responseByNodeId);
  if (!isLegacyNodeVisible(node, answers)) return false;

  if (node.kind === 'start' || node.kind === 'end' || node.kind === 'section' || node.kind === 'note') {
    return node.clientVisible;
  }

  const incoming = graph.edges.filter((edge) => edge.to === node.id);
  if (incoming.length === 0) return true;

  for (const edge of incoming) {
    if (edge.when.type === 'always') return true;
    const sourceResponse = responseByNodeId.get(edge.from);
    if (!sourceResponse) continue;
    if (edge.when.type === 'exists' && hasValue(sourceResponse)) return true;
    if (edge.when.type === 'yes' && isYesValue(sourceResponse.value)) return true;
    if (edge.when.type === 'no' && isNoValue(sourceResponse.value)) return true;
    if (edge.when.type === 'choice_equals') {
      if (
        typeof sourceResponse.value === 'string' &&
        sourceResponse.value === edge.when.optionId
      ) {
        return true;
      }
    }
    if (edge.when.type === 'choice_contains') {
      if (
        Array.isArray(sourceResponse.value) &&
        edge.when.optionId &&
        sourceResponse.value.includes(edge.when.optionId)
      ) {
        return true;
      }
    }
  }

  return false;
}

function isLegacyNodeVisible(node: QuestionnaireNode, answers: Answers): boolean {
  if (!node.clientVisible) return false;
  if (!node.legacyStepId) return true;
  const step = ALL_STEPS.find((item) => item.id === node.legacyStepId);
  if (!step) return true;
  if (!step.showIf(answers)) return false;
  if (!node.legacyFieldId) return true;
  const field = step.fields.find((item) => item.id === node.legacyFieldId);
  if (!field?.showIf) return true;
  return field.showIf(answers);
}

export function buildLegacyAnswersFromResponses(
  graph: QuestionnaireGraph,
  responseByNodeId: Map<string, NodeResponse>
): Answers {
  const answers: Answers = {};
  for (const node of graph.nodes) {
    if (!node.legacyFieldId) continue;
    const response = responseByNodeId.get(node.id);
    const value = responseToFieldValue(response);
    if (value === undefined) continue;
    answers[node.legacyFieldId] = value;
  }
  return answers;
}

function isFilesValue(
  value: unknown
): value is { files: Array<{ id: string; name: string; uploadedAt: string }> } {
  if (typeof value !== 'object' || value == null) return false;
  return 'files' in value && Array.isArray((value as { files?: unknown }).files);
}

function responseToFieldValue(response: NodeResponse | undefined): FieldValue | undefined {
  if (!response) return undefined;
  if (response.skipped) return '';
  if (response.value == null) return undefined;
  if (typeof response.value === 'string') return response.value;
  if (Array.isArray(response.value)) return response.value;
  if (typeof response.value === 'boolean') return response.value ? 'Yes' : 'No';
  if (typeof response.value === 'number') return String(response.value);
  if (isFilesValue(response.value)) {
    return response.value.files.map((file) => file.name);
  }
  if (typeof response.value === 'object') {
    const entries = Object.entries(response.value)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => [key, String(value)] as const);
    return Object.fromEntries(entries);
  }
  return undefined;
}

function hasValue(response: NodeResponse): boolean {
  if (response.value == null) return false;
  if (typeof response.value === 'string') return response.value.trim().length > 0;
  if (typeof response.value === 'number') return true;
  if (typeof response.value === 'boolean') return true;
  if (Array.isArray(response.value)) return response.value.length > 0;
  if (isFilesValue(response.value)) {
    return response.value.files.length > 0;
  }
  if (typeof response.value === 'object') return Object.keys(response.value).length > 0;
  return false;
}

function isYesValue(value: NodeResponse['value']): boolean {
  if (value === true) return true;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'yes';
  return false;
}

function isNoValue(value: NodeResponse['value']): boolean {
  if (value === false) return true;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'no';
  return false;
}
