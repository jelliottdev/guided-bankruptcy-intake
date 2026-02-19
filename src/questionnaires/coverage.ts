import { FILING_CRITICAL_LABELS, FILING_LABEL_IDS } from './labels';
import type { FilingLabel, NodeResponse, QuestionnaireAssignment, QuestionnaireTemplate } from './types';
import { buildLegacyAnswersFromResponses, evaluateNodeVisibility } from './runtime/evaluateVisibility';

export interface CoverageState {
  label: FilingLabel;
  covered: boolean;
  missingCount: number;
  blockingCount: number;
}

export function computeCoverageState(
  template: QuestionnaireTemplate | null,
  assignment: QuestionnaireAssignment | null,
  responses: NodeResponse[]
): CoverageState[] {
  if (!template || !assignment) {
    return FILING_LABEL_IDS.map((label) => ({
      label,
      covered: false,
      missingCount: 0,
      blockingCount: 0,
    }));
  }

  const version = template.versions.find((item) => item.version === assignment.templateVersion);
  if (!version) {
    return FILING_LABEL_IDS.map((label) => ({
      label,
      covered: false,
      missingCount: 0,
      blockingCount: 0,
    }));
  }

  const responseByNodeId = new Map(
    responses.filter((item) => item.assignmentId === assignment.id).map((item) => [item.nodeId, item])
  );
  const legacyAnswers = buildLegacyAnswersFromResponses(version.graph, responseByNodeId);

  const trackedNodes = version.graph.nodes.filter(
    (node) =>
      (node.kind === 'question' || node.kind === 'doc_request' || node.kind === 'decision') &&
      node.labels.length > 0 &&
      evaluateNodeVisibility(node, version.graph, responseByNodeId, legacyAnswers)
  );

  return FILING_LABEL_IDS.map((label) => {
    const nodesForLabel = trackedNodes.filter((node) => node.labels.includes(label));
    if (nodesForLabel.length === 0) {
      return {
        label,
        covered: !FILING_CRITICAL_LABELS.includes(label),
        missingCount: FILING_CRITICAL_LABELS.includes(label) ? 1 : 0,
        blockingCount: 0,
      };
    }

    let missingCount = 0;
    let blockingCount = 0;

    for (const node of nodesForLabel) {
      const response = responseByNodeId.get(node.id);
      const answered = hasNodeResponse(response);
      if (!answered) {
        missingCount += 1;
        if (node.required || node.blocksWorkflow) {
          blockingCount += 1;
        }
      }
    }

    return {
      label,
      covered: missingCount === 0,
      missingCount,
      blockingCount,
    };
  });
}

function hasNodeResponse(response: NodeResponse | undefined): boolean {
  if (!response) return false;
  if (response.skipped) return true;
  if (response.value == null) return false;
  if (typeof response.value === 'string') return response.value.trim().length > 0;
  if (typeof response.value === 'number') return true;
  if (typeof response.value === 'boolean') return true;
  if (Array.isArray(response.value)) return response.value.length > 0;
  if (typeof response.value === 'object' && 'files' in response.value) {
    return Array.isArray(response.value.files) && response.value.files.length > 0;
  }
  if (typeof response.value === 'object') return Object.keys(response.value).length > 0;
  return false;
}
