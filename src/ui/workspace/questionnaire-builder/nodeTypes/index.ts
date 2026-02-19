import type { NodeTypes } from '@xyflow/react';
import { DecisionNode } from './DecisionNode';
import { DocRequestNode } from './DocRequestNode';
import { FlowNode } from './FlowNode';
import { QuestionNode } from './QuestionNode';
import { SectionNode } from './SectionNode';

export const QUESTIONNAIRE_NODE_TYPES: NodeTypes = {
  question: QuestionNode,
  decision: DecisionNode,
  doc_request: DocRequestNode,
  section: SectionNode,
  start: FlowNode,
  end: FlowNode,
  task: FlowNode,
  approval_gate: FlowNode,
  reminder: FlowNode,
  note: FlowNode,
};
