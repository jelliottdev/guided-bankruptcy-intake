import { useRef, useEffect } from 'react';

interface ProgressProps {
  currentStepIndex: number;
  totalSteps: number;
}

/** Progress bar never animates backward when visible steps shrink (e.g. joint → alone). */
export function Progress({ currentStepIndex, totalSteps }: ProgressProps) {
  const stepNum = currentStepIndex + 1;
  const pct = totalSteps > 0 ? (stepNum / totalSteps) * 100 : 0;
  const maxPctRef = useRef(pct);
  useEffect(() => {
    if (currentStepIndex === 0) maxPctRef.current = pct;
    else if (pct > maxPctRef.current) maxPctRef.current = pct;
  }, [currentStepIndex, pct]);
  const displayPct = Math.max(pct, maxPctRef.current);

  return (
    <div className="progress-block">
      <p className="progress-step-counter">
        Step {stepNum} of {totalSteps}
      </p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${displayPct}%` }} />
      </div>
    </div>
  );
}
