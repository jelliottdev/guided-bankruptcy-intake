import { describe, expect, it } from 'vitest';
import type { QuestionnaireAssignment, QuestionnaireTemplate } from './types';
import { normalizeTitles, stripAutoCopyArtifacts } from './store';

function makeTemplate(input: Partial<QuestionnaireTemplate> & Pick<QuestionnaireTemplate, 'id' | 'title'>): QuestionnaireTemplate {
  const ts = '2026-02-14T00:00:00.000Z';
  return {
    id: input.id,
    title: input.title,
    description: input.description ?? 'Template',
    scope: 'firm',
    kind: input.kind ?? 'custom',
    isDefault: input.isDefault ?? false,
    createdBy: input.createdBy ?? 'attorney',
    createdAt: input.createdAt ?? ts,
    updatedAt: input.updatedAt ?? ts,
    activeVersion: 1,
    versions: [
      {
        version: 1,
        graph: { nodes: [], edges: [] },
      },
    ],
    archived: input.archived,
  };
}

function makeAssignment(input: Partial<QuestionnaireAssignment> & Pick<QuestionnaireAssignment, 'id' | 'templateId' | 'title'>): QuestionnaireAssignment {
  const ts = '2026-02-14T00:00:00.000Z';
  return {
    id: input.id,
    templateId: input.templateId,
    templateVersion: input.templateVersion ?? 1,
    title: input.title,
    assignedAt: input.assignedAt ?? ts,
    assignedBy: 'attorney',
    dueAt: input.dueAt,
    computedStage: input.computedStage,
  };
}

describe('questionnaires title normalization', () => {
  it('stripAutoCopyArtifacts removes legacy copy artifacts', () => {
    expect(stripAutoCopyArtifacts('Copy of Guided Bankruptcy Intake')).toBe('Guided Bankruptcy Intake');
    expect(stripAutoCopyArtifacts('Guided Bankruptcy Intake (Copy)')).toBe('Guided Bankruptcy Intake');
    expect(stripAutoCopyArtifacts('  Guided Bankruptcy Intake (Copy)  ')).toBe('Guided Bankruptcy Intake');
  });

  it('normalizeTitles renames attorney templates with Copy-of artifacts and uniquifies', () => {
    const templates: QuestionnaireTemplate[] = [
      makeTemplate({ id: 'system', title: 'Guided Bankruptcy Intake', createdBy: 'system', kind: 'intake' }),
      makeTemplate({ id: 'a1', title: 'Copy of Guided Bankruptcy Intake', createdBy: 'attorney' }),
      makeTemplate({ id: 'a2', title: 'Guided Bankruptcy Intake (2)', createdBy: 'attorney' }),
      makeTemplate({ id: 'a3', title: 'Guided Bankruptcy Intake (Copy)', createdBy: 'attorney' }),
    ];

    const assignments: QuestionnaireAssignment[] = [];
    const normalized = normalizeTitles({ templates, assignments });

    expect(normalized.changed).toBe(true);
    expect(normalized.templates.find((t) => t.id === 'system')?.title).toBe('Guided Bankruptcy Intake');
    expect(normalized.templates.find((t) => t.id === 'a1')?.title).toBe('Guided Bankruptcy Intake (3)');
    expect(normalized.templates.find((t) => t.id === 'a2')?.title).toBe('Guided Bankruptcy Intake (2)');
    expect(normalized.templates.find((t) => t.id === 'a3')?.title).toBe('Guided Bankruptcy Intake (4)');
  });

  it('normalizeTitles renames assignment titles with Copy-of artifacts and uniquifies', () => {
    const templates: QuestionnaireTemplate[] = [];
    const assignments: QuestionnaireAssignment[] = [
      makeAssignment({ id: 'x1', templateId: 't', title: 'Guided Bankruptcy Intake' }),
      makeAssignment({ id: 'x2', templateId: 't', title: 'Copy of Guided Bankruptcy Intake' }),
      makeAssignment({ id: 'x3', templateId: 't', title: 'Guided Bankruptcy Intake (Copy)' }),
    ];

    const normalized = normalizeTitles({ templates, assignments });
    expect(normalized.changed).toBe(true);
    expect(normalized.assignments.find((a) => a.id === 'x1')?.title).toBe('Guided Bankruptcy Intake');
    expect(normalized.assignments.find((a) => a.id === 'x2')?.title).toBe('Guided Bankruptcy Intake (2)');
    expect(normalized.assignments.find((a) => a.id === 'x3')?.title).toBe('Guided Bankruptcy Intake (3)');
  });

  it('normalizeTitles is idempotent once artifacts are removed', () => {
    const templates: QuestionnaireTemplate[] = [
      makeTemplate({ id: 'a1', title: 'Guided Bankruptcy Intake', createdBy: 'attorney' }),
      makeTemplate({ id: 'a2', title: 'Guided Bankruptcy Intake (2)', createdBy: 'attorney' }),
    ];
    const assignments: QuestionnaireAssignment[] = [
      makeAssignment({ id: 'x1', templateId: 't', title: 'Ch7 Follow-up' }),
    ];

    const first = normalizeTitles({ templates, assignments });
    const second = normalizeTitles({ templates: first.templates, assignments: first.assignments });

    expect(first.changed).toBe(false);
    expect(second.changed).toBe(false);
  });
});

