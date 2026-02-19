import type { QuestionnaireTemplate } from '../types';
import { buildGuidedIntakeGraph } from './intakeGraph';

function nowIso(): string {
  return new Date().toISOString();
}

export function createSeedTemplates(): QuestionnaireTemplate[] {
  const ts = nowIso();
  const guidedIntakeGraph = buildGuidedIntakeGraph();
  return [
    {
      id: 'intake-default',
      title: 'Guided Bankruptcy Intake',
      description: 'System intake assignment with filing-critical questions and branching.',
      scope: 'firm',
      kind: 'intake',
      isDefault: true,
      createdBy: 'system',
      createdAt: ts,
      updatedAt: ts,
      activeVersion: 1,
      versions: [
        {
          version: 1,
          publishedAt: ts,
          publishedBy: 'system',
          notes: 'Initial intake graph seed',
          graph: guidedIntakeGraph,
        },
      ],
    },
    {
      id: 'template-ch7-followup',
      title: 'Ch7 Follow-up',
      description: 'Attorney follow-up questionnaire for remaining filing blockers.',
      scope: 'firm',
      kind: 'custom',
      isDefault: false,
      createdBy: 'system',
      createdAt: ts,
      updatedAt: ts,
      activeVersion: 1,
      versions: [
        {
          version: 1,
          publishedAt: ts,
          publishedBy: 'system',
          graph: {
            nodes: [
              { id: 's', kind: 'start', title: 'Start', clientVisible: false, labels: [], ui: { x: 40, y: 80 } },
              {
                id: 'q1',
                kind: 'question',
                title: 'Have any assets changed in the last 30 days?',
                clientVisible: true,
                labels: ['assets', 'schedule_a_b'],
                inputType: 'yes_no',
                required: true,
                blocksWorkflow: true,
                ui: { x: 240, y: 80 },
              },
              {
                id: 'q2',
                kind: 'question',
                title: 'Describe the change and estimated value impact.',
                clientVisible: true,
                labels: ['assets', 'exemptions'],
                inputType: 'textarea',
                required: true,
                blocksWorkflow: true,
                ui: { x: 460, y: 20 },
              },
              { id: 'end', kind: 'end', title: 'End', clientVisible: false, labels: [], ui: { x: 680, y: 80 } },
            ],
            edges: [
              { id: 'e1', from: 's', to: 'q1', when: { type: 'always' } },
              { id: 'e2', from: 'q1', to: 'q2', when: { type: 'yes' } },
              { id: 'e3', from: 'q1', to: 'end', when: { type: 'no' } },
              { id: 'e4', from: 'q2', to: 'end', when: { type: 'always' } },
            ],
          },
        },
      ],
    },
    {
      id: 'template-doc-clarification',
      title: 'Document Clarification',
      description: 'Structured clarification flow for insufficient uploads.',
      scope: 'firm',
      kind: 'custom',
      isDefault: false,
      createdBy: 'system',
      createdAt: ts,
      updatedAt: ts,
      activeVersion: 1,
      versions: [
        {
          version: 1,
          publishedAt: ts,
          publishedBy: 'system',
          graph: {
            nodes: [
              { id: 's', kind: 'start', title: 'Start', clientVisible: false, labels: [], ui: { x: 40, y: 90 } },
              {
                id: 'doc',
                kind: 'doc_request',
                title: 'Upload replacement document file',
                clientVisible: true,
                labels: ['documents'],
                inputType: 'file_upload',
                required: true,
                blocksWorkflow: true,
                fileRules: { minFiles: 1 },
                ui: { x: 260, y: 90 },
              },
              {
                id: 'note',
                kind: 'question',
                title: 'If unavailable, explain what you can provide instead.',
                clientVisible: true,
                labels: ['documents', 'other'],
                inputType: 'textarea',
                required: true,
                blocksWorkflow: true,
                ui: { x: 500, y: 90 },
              },
              { id: 'e', kind: 'end', title: 'End', clientVisible: false, labels: [], ui: { x: 720, y: 90 } },
            ],
            edges: [
              { id: 'a', from: 's', to: 'doc', when: { type: 'always' } },
              { id: 'b', from: 'doc', to: 'note', when: { type: 'always' } },
              { id: 'c', from: 'note', to: 'e', when: { type: 'always' } },
            ],
          },
        },
      ],
    },
  ];
}
