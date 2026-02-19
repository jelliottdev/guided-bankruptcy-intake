import type { Answers, FieldValue, Step } from '../../form/types';

interface SectionRailProps {
  steps: Step[];
  answers: Answers;
  currentStepIndex: number;
  missingFieldIds: Set<string>;
  issueFieldIds: Set<string>;
  onJumpToStep: (stepIndex: number) => void;
}

function isEmpty(value: FieldValue | undefined): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function SectionRail({
  steps,
  answers,
  currentStepIndex,
  missingFieldIds,
  issueFieldIds,
  onJumpToStep,
}: SectionRailProps) {
  const attentionCount = steps.reduce((count, step) => {
    const stepFieldIds = step.fields.map((f) => f.id);
    return count + (stepFieldIds.some((id) => missingFieldIds.has(id)) ? 1 : 0);
  }, 0);

  return (
    <div className="section-rail">
      <div className="section-rail-head">
        <h3>Sections</h3>
        {attentionCount > 0 && <span className="section-rail-summary">{attentionCount} need review</span>}
      </div>
      <ul>
        {steps.map((step, index) => {
          const stepFieldIds = step.fields.map((f) => f.id);
          const visibleRequiredFields = step.fields.filter((field) => {
            if (!field.required) return false;
            if (field.showIf && !field.showIf(answers)) return false;
            return true;
          });
          const hasMissing = stepFieldIds.some((id) => missingFieldIds.has(id));
          const hasIssue = stepFieldIds.some((id) => issueFieldIds.has(id));
          const hasRequired = visibleRequiredFields.length > 0;
          const requiredComplete = hasRequired && visibleRequiredFields.every((field) => !isEmpty(answers[field.id]));
          const dotState = hasMissing ? 'missing' : hasIssue ? 'attention' : hasRequired && requiredComplete ? 'ok' : 'neutral';
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`section-rail-item ${index === currentStepIndex ? 'active' : ''}`}
                onClick={() => onJumpToStep(index)}
              >
                <span className={`section-dot ${dotState}`} aria-hidden />
                <span className="section-name">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
