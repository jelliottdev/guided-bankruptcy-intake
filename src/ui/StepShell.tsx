import type { ReactNode } from 'react';
import { Progress } from './Progress';

interface StepShellProps {
  title: string;
  description?: string;
  /** One-line reassurance under header (e.g. "If you're unsure, enter your best estimate.") */
  reassurance?: string;
  /** Shown at top of step when present (e.g. global document upload instructions) */
  uploadInstructions?: string;
  children: ReactNode;
  currentStepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  onSubmit?: () => void;
  saveStatusText: string;
  focusFieldId?: string | null;
  nextDisabled?: boolean;
  stepBanner?: string;
  saving?: boolean;
}

export function StepShell({
  title,
  description,
  reassurance,
  uploadInstructions,
  children,
  currentStepIndex,
  totalSteps,
  onBack,
  onNext,
  isLastStep,
  onSubmit,
  saveStatusText,
  nextDisabled = false,
  stepBanner,
  saving = false,
}: StepShellProps) {
  return (
    <div className="step-shell">
      <div className="step-content">
        <div className="step-header-block">
          <Progress currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
          <h2>{title}</h2>
          {description && <p className="header-subtext">{description}</p>}
          {reassurance && <p className="step-reassurance" aria-live="polite">{reassurance}</p>}
        </div>
        {uploadInstructions && (
          <div className="upload-instructions-block" role="region" aria-label="Document upload instructions">
            {uploadInstructions.split('\n').map((line, i) => (
              <p key={i} className={line.trimStart().startsWith('Demo:') ? 'upload-instructions-demo' : undefined}>
                {line}
              </p>
            ))}
          </div>
        )}
        {stepBanner && <p className="step-banner" role="alert">{stepBanner}</p>}
        <div className="step-fields">{children}</div>
      </div>
      <div className="step-footer">
      <nav className="nav-bar">
        <div>
          <button
            type="button"
            onClick={onBack}
            disabled={currentStepIndex === 0}
          >
            Back
          </button>
          {isLastStep ? (
            <button type="button" className="primary" onClick={onSubmit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit (Demo)'}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={onNext}
              disabled={nextDisabled}
            >
              Next
            </button>
          )}
        </div>
        <p className="save-status">{saveStatusText}</p>
      </nav>
      </div>
    </div>
  );
}
