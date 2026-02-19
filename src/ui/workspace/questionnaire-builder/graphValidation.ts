import type { QuestionnaireGraph, QuestionnaireNode } from '../../../questionnaires/types';

export interface GraphValidationResult {
  errors: string[];
  warnings: string[];
}

const BRANCHING_KINDS = new Set(['decision']);
const WORKFLOW_NODE_KINDS = new Set(['question', 'doc_request', 'decision', 'task', 'approval_gate', 'reminder']);

export function validateGraph(graph: QuestionnaireGraph): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  if (!graph.nodes.some((node) => node.kind === 'start')) {
    errors.push('Graph requires a Start node.');
  }
  if (!graph.nodes.some((node) => node.kind === 'end')) {
    errors.push('Graph requires an End node.');
  }

  for (const edge of graph.edges) {
    if (!nodeById.has(edge.from)) errors.push(`Edge ${edge.id} has unknown source node.`);
    if (!nodeById.has(edge.to)) errors.push(`Edge ${edge.id} has unknown target node.`);
  }

  const cycleDetected = hasCycle(graph);
  if (cycleDetected) {
    errors.push('Cycles are not allowed.');
  }

  for (const node of graph.nodes) {
    if ((node.kind === 'question' || node.kind === 'doc_request' || node.kind === 'decision') && node.labels.length === 0) {
      errors.push(`Node "${node.title}" must include at least one filing label.`);
    }

    if (node.kind === 'question' && !node.inputType) {
      errors.push(`Question "${node.title}" is missing an input type.`);
    }

    const outgoing = graph.edges.filter((edge) => edge.from === node.id);
    if (!BRANCHING_KINDS.has(node.kind) && outgoing.length > 1) {
      warnings.push(`Node "${node.title}" has multiple outgoing edges; this can reduce predictability.`);
    }

    if (node.kind === 'decision') {
      const yesEdges = outgoing.filter((edge) => edge.when.type === 'yes').length;
      const noEdges = outgoing.filter((edge) => edge.when.type === 'no').length;
      if (yesEdges === 0 || noEdges === 0) {
        warnings.push(`Decision "${node.title}" should define both Yes and No paths.`);
      }
    }
  }

  const workflowNodes = graph.nodes.filter((node) => WORKFLOW_NODE_KINDS.has(node.kind));
  if (workflowNodes.length > 60) {
    warnings.push('This questionnaire is large (> 60 workflow nodes). Consider splitting into smaller assignments.');
  }

  const missingSectionNodes = graph.nodes.filter(
    (node) => (node.kind === 'question' || node.kind === 'doc_request' || node.kind === 'decision') && !node.sectionId
  );
  if (missingSectionNodes.length > 0) {
    warnings.push(`${missingSectionNodes.length} nodes are not assigned to a section.`);
  }

  return { errors, warnings };
}

function hasCycle(graph: QuestionnaireGraph): boolean {
  const edgesByFrom = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = edgesByFrom.get(edge.from) ?? [];
    list.push(edge.to);
    edgesByFrom.set(edge.from, list);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    if (visited.has(nodeId)) return false;
    if (visiting.has(nodeId)) return true;
    visiting.add(nodeId);
    const children = edgesByFrom.get(nodeId) ?? [];
    for (const child of children) {
      if (dfs(child)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const node of graph.nodes) {
    if (dfs(node.id)) return true;
  }
  return false;
}

export function defaultNodeColor(kind: QuestionnaireNode['kind']): 'primary' | 'success' | 'warning' | 'neutral' {
  if (kind === 'decision' || kind === 'approval_gate') return 'warning';
  if (kind === 'doc_request') return 'success';
  if (kind === 'question') return 'primary';
  return 'neutral';
}
