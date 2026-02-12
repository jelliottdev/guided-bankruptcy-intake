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
}: StepShellProps) {
  return (
    <>
      <Progress currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
      <h2>{title}</h2>
      {description && <p className="header-subtext">{description}</p>}
      <div style={{ marginBottom: '2rem' }}>{children}</div>
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
            <button type="button" className="primary" onClick={onSubmit}>
              Submit (Demo)
            </button>
          ) : (
            <button type="button" className="primary" onClick={onNext}>
              Next
            </button>
          )}
        </div>
        <p className="save-status">{saveStatusText}</p>
      </nav>
    </>
  );
}
