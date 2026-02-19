import type { NodeResponse, QuestionnaireEdge } from '../types';

export function nextNodeIds(
  sourceNodeId: string,
  edges: QuestionnaireEdge[],
  responseByNodeId: Map<string, NodeResponse>
): string[] {
  const outgoing = edges.filter((edge) => edge.from === sourceNodeId);
  if (outgoing.length === 0) return [];

  return outgoing
    .filter((edge) => matchesEdgeCondition(edge, responseByNodeId.get(sourceNodeId)))
    .map((edge) => edge.to);
}

function matchesEdgeCondition(edge: QuestionnaireEdge, response: NodeResponse | undefined): boolean {
  if (edge.when.type === 'always') return true;
  if (!response) return false;

  if (edge.when.type === 'exists') return hasValue(response);
  if (edge.when.type === 'yes') return response.value === true;
  if (edge.when.type === 'no') return response.value === false;

  if (edge.when.type === 'choice_equals') {
    return typeof response.value === 'string' && response.value === edge.when.optionId;
  }
  if (edge.when.type === 'choice_contains') {
    return Array.isArray(response.value) && Boolean(edge.when.optionId) && response.value.includes(edge.when.optionId as string);
  }
  return false;
}

function hasValue(response: NodeResponse): boolean {
  if (response.value == null) return false;
  if (typeof response.value === 'string') return response.value.trim().length > 0;
  if (typeof response.value === 'number') return true;
  if (typeof response.value === 'boolean') return true;
  if (Array.isArray(response.value)) return response.value.length > 0;
  if (typeof response.value === 'object' && 'files' in response.value) return response.value.files.length > 0;
  if (typeof response.value === 'object') return Object.keys(response.value).length > 0;
  return false;
}
