import type { ReactNode } from 'react';
import { Progress } from './Progress';

interface StepShellProps {
  title: string;
  description?: string;
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
        <Progress currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
        <h2>{title}</h2>
        {description && <p className="header-subtext">{description}</p>}
        {stepBanner && <p className="step-banner" role="alert">{stepBanner}</p>}
        <div style={{ marginBottom: '24px' }}>{children}</div>
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
