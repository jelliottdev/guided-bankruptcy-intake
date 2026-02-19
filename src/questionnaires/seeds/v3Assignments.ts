import type { QuestionnaireAssignment, QuestionnaireTemplate } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

export function createSeedAssignments(templates: QuestionnaireTemplate[]): QuestionnaireAssignment[] {
  const ts = nowIso();
  const intake = templates.find((item) => item.id === 'intake-default');
  const followup = templates.find((item) => item.id === 'template-ch7-followup');

  const assignments: QuestionnaireAssignment[] = [];

  if (intake) {
    assignments.push({
      id: 'assign-intake-1',
      templateId: intake.id,
      templateVersion: intake.activeVersion,
      title: intake.title,
      assignedAt: ts,
      assignedBy: 'attorney',
      computedStage: 'assigned',
    });
  }

  if (followup) {
    assignments.push({
      id: 'assign-followup-1',
      templateId: followup.id,
      templateVersion: followup.activeVersion,
      title: followup.title,
      assignedAt: ts,
      assignedBy: 'attorney',
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      computedStage: 'assigned',
    });
  }

  return assignments;
}
