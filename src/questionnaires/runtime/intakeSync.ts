import type { Answers, Flags, Uploads } from '../../form/types';
import type { NodeResponse, QuestionnaireGraph, ResponseValue } from '../types';

export type IntakeSyncResult = { answers: Answers; uploads: Uploads; flags: Flags };

function isFilesValue(
  value: ResponseValue
): value is { files: Array<{ id: string; name: string; uploadedAt: string }> } {
  if (typeof value !== 'object' || value == null) return false;
  // `ResponseValue` also allows `Record<string, string>`, so ensure `files` is an array.
  return 'files' in value && Array.isArray((value as { files?: unknown }).files);
}

function mapAnswerValue(value: ResponseValue): Answers[string] | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isFilesValue(value)) return undefined;
  if (typeof value === 'object') return value;
  return undefined;
}

export function buildIntakeStateFromAssignment(
  graph: QuestionnaireGraph,
  responses: NodeResponse[]
): IntakeSyncResult {
  const responseByNodeId = new Map<string, NodeResponse>();
  for (const response of responses) {
    responseByNodeId.set(response.nodeId, response);
  }

  const answers: Answers = {};
  const uploads: Uploads = {};
  const flags: Flags = {};

  for (const node of graph.nodes) {
    const legacyFieldId = node.legacyFieldId;
    if (!legacyFieldId) continue;

    const response = responseByNodeId.get(node.id);
    if (!response) continue;

    if (response.skipped) {
      flags[legacyFieldId] = {
        flagged: true,
        note: response.skipped.reason ?? '',
        resolved: false,
      };
      continue;
    }

    const value = response.value;
    if (value == null) continue;

    if (isFilesValue(value)) {
      const fileNames = value.files.map((file) => file.name).filter(Boolean);
      if (fileNames.length > 0) uploads[legacyFieldId] = fileNames;
      continue;
    }

    const mapped = mapAnswerValue(value);
    if (mapped !== undefined) answers[legacyFieldId] = mapped;
  }

  return { answers, uploads, flags };
}
