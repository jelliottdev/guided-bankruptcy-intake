import { useIntake } from '../state/IntakeProvider';
import { getVisibleSteps } from '../form/steps';
import { validateAll } from '../form/validate';
import { FieldRenderer } from './FieldRenderer';
import { StepShell } from './StepShell';

interface ReviewProps {
  currentStepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: () => void;
  saveStatusText: string;
  jumpToStep: (stepIndex: number, fieldId?: string) => void;
  submitted: boolean;
}

/** Format YYYY-MM-DD as MM/DD/YYYY for display. */
function formatDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

function formatVal(value: unknown, isDate = false): string {
  if (value == null) return '—';
  if (isDate) {
    const formatted = formatDate(value);
    return formatted ?? (typeof value === 'string' ? value : '—');
  }
  if (typeof value === 'string') return value || '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return Object.keys(value).length ? JSON.stringify(value) : '—';
  return String(value);
}

export function Review({
  currentStepIndex,
  totalSteps,
  onBack,
  onSubmit,
  saveStatusText,
  jumpToStep,
  submitted,
}: ReviewProps) {
  const { state, setAnswer } = useIntake();
  const { answers, uploads, saving } = state;
  const visibleSteps = getVisibleSteps(answers);
  const allValidation = validateAll(answers);
  const errors = allValidation.filter((e) => e.severity !== 'warning');

  if (submitted) {
    return (
      <div className="confirmation-screen">
        <h2>Thank you</h2>
        <p>Your responses have been saved locally for this demo.</p>
        <p>Use &quot;Reset demo&quot; in the footer to start over.</p>
      </div>
    );
  }

  const confidenceValue = answers['confidence'];
  const confidenceError = errors.find((e) => e.fieldId === 'confidence');

  return (
    <StepShell
      title="Final Review"
      currentStepIndex={currentStepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => {}}
      isLastStep={true}
      onSubmit={onSubmit}
      saveStatusText={saveStatusText}
      stepBanner={errors.length > 0 ? 'Complete the items below before submitting.' : undefined}
      saving={saving}
    >
      <h3>Summary by section</h3>
      {visibleSteps
        .filter((step) => step.id !== 'final_review')
        .map((step) => (
          <div key={step.id} className="review-card">
            <h4>{step.title}</h4>
            {step.fields
              .filter((f) => !f.showIf || f.showIf(answers))
              .map((f) => {
                const label = typeof f.label === 'string' ? f.label.replace(/\*/g, '').trim() : String(f.id);
                if (f.type === 'file') {
                  const fileList = uploads[f.id] ?? [];
                  return (
                    <p key={f.id}>
                      {label}: {fileList.length > 0 ? fileList.join(', ') : '—'}
                    </p>
                  );
                }
                const v = answers[f.id];
                const isDate = f.type === 'date';
                return (
                  <p key={f.id}>
                    {label}: {formatVal(v, isDate)}
                  </p>
                );
              })}
          </div>
        ))}

      {errors.length > 0 && (
        <>
          <h3>Missing required items</h3>
          <ul className="review-missing">
            {errors.map((er) => (
              <li key={`${er.stepIndex}-${er.fieldId}`}>
                {er.message}{' '}
                <button
                  type="button"
                  className="review-fix-link"
                  onClick={() => jumpToStep(er.stepIndex, er.fieldId)}
                >
                  Go fix
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Confidence</h3>
      {(() => {
        const step = visibleSteps.find((s) => s.id === 'final_review');
        const confidenceField = step?.fields.find((f) => f.id === 'confidence');
        if (!confidenceField) return null;
        return (
          <FieldRenderer
            field={confidenceField}
            value={confidenceValue}
            onChange={(v) => setAnswer('confidence', v)}
            answers={answers}
            error={confidenceError?.message}
          />
        );
      })()}
    </StepShell>
  );
}
