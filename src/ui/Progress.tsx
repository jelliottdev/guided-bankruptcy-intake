interface ProgressProps {
  currentStepIndex: number;
  totalSteps: number;
}

export function Progress({ currentStepIndex, totalSteps }: ProgressProps) {
  const stepNum = currentStepIndex + 1;
  const pct = totalSteps > 0 ? (stepNum / totalSteps) * 100 : 0;

  return (
    <div className="progress-block">
      <p className="progress-step-counter">
        Step {stepNum} of {totalSteps}
      </p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
