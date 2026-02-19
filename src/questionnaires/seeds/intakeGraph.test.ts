import { describe, expect, it } from 'vitest';
import { ALL_STEPS } from '../../form/steps';
import { buildGuidedIntakeGraph, GUIDED_INTAKE_FIELD_COUNT, GUIDED_INTAKE_STEP_COUNT } from './intakeGraph';

describe('buildGuidedIntakeGraph', () => {
  it('includes every intake step and field in the graph', () => {
    const graph = buildGuidedIntakeGraph();

    const sectionNodes = graph.nodes.filter((node) => node.kind === 'section');
    const fieldNodes = graph.nodes.filter(
      (node) => node.kind === 'question' || node.kind === 'doc_request'
    );

    expect(sectionNodes).toHaveLength(GUIDED_INTAKE_STEP_COUNT);
    expect(sectionNodes).toHaveLength(ALL_STEPS.length);
    expect(fieldNodes).toHaveLength(GUIDED_INTAKE_FIELD_COUNT);

    for (const step of ALL_STEPS) {
      expect(
        sectionNodes.some((node) => node.legacyStepId === step.id && node.title === step.title)
      ).toBe(true);

      for (const field of step.fields) {
        expect(
          fieldNodes.some(
            (node) => node.legacyStepId === step.id && node.legacyFieldId === field.id
          )
        ).toBe(true);
      }
    }
  });

  it('maps field input types and metadata for runtime rendering', () => {
    const graph = buildGuidedIntakeGraph();

    for (const step of ALL_STEPS) {
      for (const field of step.fields) {
        const node = graph.nodes.find(
          (candidate) =>
            candidate.legacyStepId === step.id && candidate.legacyFieldId === field.id
        );
        expect(node, `missing node for ${step.id}.${field.id}`).toBeTruthy();
        if (!node) continue;

        if (field.type === 'textarea') {
          expect(node.inputType).toBe('textarea');
        } else if (field.type === 'email') {
          expect(node.inputType).toBe('email');
        } else if (field.type === 'date') {
          expect(node.inputType).toBe('date');
        } else if (field.type === 'radio' || field.type === 'select') {
          expect(node.inputType).toBe('single_select');
          expect(node.options?.length ?? 0).toBe(field.options?.length ?? 0);
        } else if (field.type === 'checkbox') {
          expect(node.inputType).toBe('multi_select');
          expect(node.options?.length ?? 0).toBe(field.options?.length ?? 0);
        } else if (field.type === 'grid') {
          expect(node.inputType).toBe('grid');
          expect(node.rows?.length ?? 0).toBe(field.rows?.length ?? 0);
          expect(node.columns?.length ?? 0).toBe(field.columns?.length ?? 0);
        } else if (field.type === 'file') {
          expect(node.kind).toBe('doc_request');
          expect(node.inputType).toBe('file_upload');
          expect(node.fileRules).toBeTruthy();
          expect(node.labels.includes('documents')).toBe(true);
        } else {
          expect(node.inputType).toBe('text');
        }

        expect(node.required ?? false).toBe(Boolean(field.required));
      }
    }
  });

  it('builds a connected linear graph from start to end', () => {
    const graph = buildGuidedIntakeGraph();

    const start = graph.nodes.find((node) => node.kind === 'start');
    const end = graph.nodes.find((node) => node.kind === 'end');
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();

    expect(graph.edges).toHaveLength(graph.nodes.length - 1);

    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();
    for (const node of graph.nodes) {
      incomingCount.set(node.id, 0);
      outgoingCount.set(node.id, 0);
    }

    for (const edge of graph.edges) {
      incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
      outgoingCount.set(edge.from, (outgoingCount.get(edge.from) ?? 0) + 1);
      expect(edge.when.type).toBe('always');
    }

    for (const node of graph.nodes) {
      if (node.kind === 'start') {
        expect(incomingCount.get(node.id)).toBe(0);
        expect(outgoingCount.get(node.id)).toBe(1);
      } else if (node.kind === 'end') {
        expect(incomingCount.get(node.id)).toBe(1);
        expect(outgoingCount.get(node.id)).toBe(0);
      } else {
        expect(incomingCount.get(node.id)).toBe(1);
        expect(outgoingCount.get(node.id)).toBe(1);
      }
    }
  });
});
