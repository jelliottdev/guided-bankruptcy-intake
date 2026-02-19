const QUESTIONNAIRE_DRAG_MIME = 'application/x-questionnaire-node-kind';
let lastDraggedQuestionnaireKind = '';

export function questionnaireDragMimeType(): string {
  return QUESTIONNAIRE_DRAG_MIME;
}

export function setLastDraggedQuestionnaireKind(kind: string): void {
  lastDraggedQuestionnaireKind = kind;
}

export function readLastDraggedQuestionnaireKind(): string {
  return lastDraggedQuestionnaireKind;
}

export function clearLastDraggedQuestionnaireKind(): void {
  lastDraggedQuestionnaireKind = '';
}
