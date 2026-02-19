import { useIntake } from '../state/IntakeProvider';
import { getVisibleSteps } from '../form/steps';
import { validateAll } from '../form/validate';
import { FieldRenderer } from './FieldRenderer';
import { StepShell } from './StepShell';
import type { Issue } from '../issues/types';
import { getDocumentSufficiency } from '../attorney/snapshot';

interface ReviewProps {
  currentStepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: () => void;
  saveStatusText: string;
  jumpToStep: (stepIndex: number, fieldId?: string) => void;
  submitted: boolean;
  issues: Issue[];
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

/** Format object as readable key-value list (no raw JSON). */
function formatObject(value: Record<string, unknown>): string {
  const entries = Object.entries(value).filter(([, v]) => v != null && String(v).trim() !== '');
  if (entries.length === 0) return '—';
  return entries
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${String(v).trim()}`;
    })
    .join('; ');
}

function formatVal(value: unknown, isDate = false): string {
  if (value == null) return '—';
  if (isDate) {
    const formatted = formatDate(value);
    return formatted ?? (typeof value === 'string' ? value : '—');
  }
  if (typeof value === 'string') return value || '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return formatObject(value as Record<string, unknown>);
  }
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
  issues,
}: ReviewProps) {
  const { state, setAnswer } = useIntake();
  const { answers, uploads, flags, saving } = state;
  const visibleSteps = getVisibleSteps(answers);
  const allValidation = validateAll(answers, flags);
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
  const missingFields = errors;
  const missingDocs = getDocumentSufficiency(answers, uploads).filter((d) => d.status === 'Missing' || d.status === 'Partial');
  const awaitingReview = issues.filter((i) => i.status === 'needs_review');

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
                    <p key={f.id} className="review-line">
                      <span className="review-q">{label}:</span>{' '}
                      <span className="review-a">{fileList.length > 0 ? fileList.join(', ') : '—'}</span>
                    </p>
                  );
                }
                const v = answers[f.id];
                const isDate = f.type === 'date';
                return (
                  <p key={f.id} className="review-line">
                    <span className="review-q">{label}:</span>{' '}
                    <span className="review-a">{formatVal(v, isDate)}</span>
                  </p>
                );
              })}
          </div>
        ))}

      {missingFields.length > 0 && (
        <>
          <h3>Missing fields</h3>
          <ul className="review-missing">
            {missingFields.map((er) => (
              <li key={`${er.stepIndex}-${er.fieldId}`} className="review-missing-item">
                <span className="review-missing-text">{er.message}</span>
                <button
                  type="button"
                  className="review-fix-btn"
                  onClick={() => jumpToStep(er.stepIndex, er.fieldId)}
                >
                  Go fix
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {missingDocs.length > 0 && (
        <>
          <h3>Missing documents</h3>
          <ul className="review-missing">
            {missingDocs.map((doc) => {
              const stepIndex = visibleSteps.findIndex((s) => s.id === 'documents');
              return (
                <li key={doc.type} className="review-missing-item">
                  <span className="review-missing-text">{doc.type} — {doc.message || doc.coverageRule}</span>
                  <button
                    type="button"
                    className="review-fix-btn"
                    onClick={() => jumpToStep(stepIndex >= 0 ? stepIndex : 0)}
                  >
                    Open documents
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {awaitingReview.length > 0 && (
        <>
          <h3>Needs attorney review</h3>
          <ul className="review-missing">
            {awaitingReview.map((issue) => {
              const linkedStepIdx = issue.linkedFieldId
                ? visibleSteps.findIndex((s) => s.fields.some((f) => f.id === issue.linkedFieldId))
                : -1;
              return (
                <li key={issue.id} className="review-missing-item">
                  <span className="review-missing-text">{issue.title}</span>
                  {issue.linkedFieldId && linkedStepIdx >= 0 && (
                    <button
                      type="button"
                      className="review-fix-btn"
                      onClick={() => jumpToStep(linkedStepIdx, issue.linkedFieldId)}
                    >
                      Open context
                    </button>
                  )}
                </li>
              );
            })}
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
