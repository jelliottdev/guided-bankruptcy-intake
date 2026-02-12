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

function formatVal(value: unknown): string {
  if (value == null) return '—';
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
  const { answers } = state;
  const errors = validateAll(answers);

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
    >
      <h3>Summary by section</h3>
      <div className="review-card">
        <h4>Filing Setup</h4>
        <p>{formatVal(answers['filing_setup'])}</p>
      </div>
      <div className="review-card">
        <h4>Debtor / Spouse</h4>
        <p>Debtor: {formatVal(answers['debtor_full_name'])}</p>
        {answers['spouse_full_name'] && <p>Spouse: {formatVal(answers['spouse_full_name'])}</p>}
      </div>
      <div className="review-card">
        <h4>Assets</h4>
        <p>Real estate: {formatVal(answers['real_estate_ownership'])}</p>
        <p>Bank accounts: {formatVal(answers['bank_accounts'])}</p>
        <p>Vehicles: {formatVal(answers['vehicles'])}</p>
      </div>
      <div className="review-card">
        <h4>Debts</h4>
        <p>Unsecured / Priority / Secured summarized above.</p>
      </div>
      <div className="review-card">
        <h4>Income / Expenses</h4>
        <p>Employment and expense estimates captured.</p>
      </div>
      <div className="review-card">
        <h4>Recent Activity</h4>
        <p>Recent financial activity answers captured.</p>
      </div>
      <div className="review-card">
        <h4>Uploads</h4>
        <p>Document uploads (filenames) stored for demo.</p>
      </div>

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
        const step = getVisibleSteps(answers).find((s) => s.id === 'final_review');
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
